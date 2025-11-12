import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id } = await req.json();

    if (!recording_id) {
      return Response.json({ error: 'recording_id is required' }, { status: 400 });
    }

    const recordings = await base44.asServiceRole.entities.Recording.filter({ id: recording_id });
    if (!recordings || recordings.length === 0) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    const recording = recordings[0];

    // FIXED: Check if file_url exists (from R2) or fallback to file_uri (Base44)
    let audioUrl = recording.file_url;
    
    if (!audioUrl && recording.file_uri) {
      // Generate signed URL if using Base44 storage
      const audioSignedUrl = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: recording.file_uri,
        expires_in: 3600
      });
      audioUrl = audioSignedUrl.signed_url;
    }

    if (!audioUrl) {
      return Response.json({ error: 'Audio file not found' }, { status: 404 });
    }

    // Get cover image if exists
    let coverUrl = null;
    if (recording.cover_id) {
      const covers = await base44.asServiceRole.entities.BroadcastCover.filter({ id: recording.cover_id });
      if (covers && covers.length > 0 && covers[0].custom_image_url) {
        coverUrl = covers[0].custom_image_url;
      }
    }

    return Response.json({
      success: false,
      manual_conversion: {
        instructions: [
          'لتحويل التسجيل إلى فيديو، استخدم الأدوات التالية:',
          '1. قم بتحميل الملف الصوتي من الرابط أدناه',
          '2. قم بتحميل صورة الغلاف من الرابط أدناه (إن وجدت)',
          '3. استخدم برنامج مثل FFmpeg أو أي محرر فيديو لدمج الصوت والصورة',
          '4. أو استخدم موقع مثل Kapwing.com للتحويل أونلاين'
        ],
        audio_url: audioUrl,
        cover_url: coverUrl,
        ffmpeg_command: coverUrl 
          ? `ffmpeg -loop 1 -i cover.jpg -i audio.webm -c:v libx264 -c:a aac -shortest output.mp4`
          : `ffmpeg -f lavfi -i color=c=black:s=1280x720 -i audio.webm -shortest -c:v libx264 -c:a aac output.mp4`
      }
    });

  } catch (error) {
    console.error('Error converting to video:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});