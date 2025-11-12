import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id } = await req.json();

    // Fetch recording details
    const recordings = await base44.entities.Recording.filter({ id: recording_id });
    if (recordings.length === 0) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    const recording = recordings[0];

    // Fetch cover
    const covers = await base44.entities.BroadcastCover.filter({ 
      broadcast_id: recording.broadcast_id 
    });

    if (covers.length === 0) {
      return Response.json({ 
        error: 'لا يوجد غلاف لهذا التسجيل',
        suggestion: 'يرجى إنشاء غلاف للبث أولاً'
      }, { status: 400 });
    }

    const cover = covers[0];

    // Get signed URL for audio file
    const audioSignedUrl = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: recording.file_uri,
      expires_in: 7200 // 2 hours
    });

    // Generate cover image using LLM integration
    const coverPrompt = `Create a beautiful Islamic educational broadcast cover with:
    - Title: "${cover.fixed_title}"
    - Lecturer: "${cover.lecturer_name}"
    - ${cover.surah_name ? `Surah: ${cover.surah_name}, Verses: ${cover.verse_from}-${cover.verse_to}` : ''}
    - ${cover.hadith_number ? `Hadith #${cover.hadith_number}` : ''}
    - Use elegant Arabic calligraphy
    - Background: gradient ${cover.background_color || '#8b5cf6'}
    - Professional, modern Islamic design
    - 1920x1080 resolution`;

    const coverImageResult = await base44.integrations.Core.GenerateImage({
      prompt: coverPrompt
    });

    const coverImageUrl = coverImageResult.url;

    // Use FFmpeg to convert audio + image to video
    // Since we're in Deno, we'll use the ffmpeg API service
    const ffmpegResponse = await fetch('https://api.ffmpeg.org/v1/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [
          { url: coverImageUrl, type: 'image' },
          { url: audioSignedUrl.signed_url, type: 'audio' }
        ],
        output: {
          format: 'mp4',
          codec: 'libx264',
          preset: 'medium',
          crf: 23,
          audio_codec: 'aac',
          audio_bitrate: '128k'
        },
        filters: [
          'scale=1920:1080',
          'format=yuv420p'
        ]
      })
    });

    if (!ffmpegResponse.ok) {
      // Alternative: Return instructions for manual conversion
      return Response.json({
        success: false,
        message: 'تعذر التحويل التلقائي',
        manual_conversion: {
          audio_url: audioSignedUrl.signed_url,
          cover_url: coverImageUrl,
          instructions: [
            '1. حمّل الملف الصوتي والغلاف',
            '2. استخدم أي برنامج تحرير فيديو (مثل Shotcut أو DaVinci Resolve)',
            '3. أضف الغلاف كصورة ثابتة',
            '4. أضف الملف الصوتي',
            '5. صدّر كفيديو MP4'
          ],
          ffmpeg_command: `ffmpeg -loop 1 -i cover.png -i audio.webm -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest output.mp4`
        }
      });
    }

    const videoResult = await ffmpegResponse.json();

    // Upload video to storage
    const videoBlob = await fetch(videoResult.output_url).then(r => r.blob());
    const videoFile = new File([videoBlob], `${recording.title}.mp4`, { type: 'video/mp4' });

    const uploadResult = await base44.integrations.Core.UploadFile({
      file: videoFile
    });

    return Response.json({
      success: true,
      video_url: uploadResult.file_url,
      message: 'تم تحويل التسجيل إلى فيديو بنجاح',
      download_link: uploadResult.file_url
    });

  } catch (error) {
    console.error('Error converting to video:', error);
    return Response.json({ 
      error: error.message,
      fallback: 'استخدم أمر FFmpeg المذكور للتحويل يدوياً'
    }, { status: 500 });
  }
});