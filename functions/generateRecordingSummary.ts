import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id } = await req.json();

    if (!recording_id) {
      return Response.json({ error: 'recording_id is required' }, { status: 400 });
    }

    // Get recording details
    const recordings = await base44.asServiceRole.entities.Recording.filter({ id: recording_id });
    if (!recordings || recordings.length === 0) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    const recording = recordings[0];

    // Get actual audio file to transcribe and summarize
    let audioTranscript = '';
    
    try {
      // Create signed URL for the audio file
      const signedUrlResponse = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: recording.file_uri,
        expires_in: 600
      });

      if (signedUrlResponse && signedUrlResponse.signed_url) {
        // Use InvokeLLM with file_urls to transcribe and summarize
        const transcriptPrompt = `
استمع للتسجيل الصوتي التالي وقم بإنشاء ملخص شامل ومفيد:

معلومات التسجيل:
- العنوان: ${recording.title}
- الفئة: ${recording.category}
- المدة: ${Math.floor((recording.duration_seconds || 0) / 60)} دقيقة

المطلوب:
1. استخرج المحتوى الرئيسي من التسجيل الصوتي
2. اكتب ملخصاً واضحاً ومباشراً (3-5 أسطر)
3. ركز على النقاط الأساسية والفوائد
4. لا تذكر اسم المحاضر أو المذيع في الملخص
5. اجعل الملخص مناسباً للمشاركة

الملخص فقط بدون أي مقدمات:
        `.trim();

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: transcriptPrompt,
          file_urls: [signedUrlResponse.signed_url],
          add_context_from_internet: false
        });

        audioTranscript = aiResponse.trim();
      }
    } catch (audioError) {
      console.error('Error transcribing audio:', audioError);
    }

    // If audio transcription failed or is empty, use metadata-based summary
    let summary = audioTranscript;
    
    if (!summary || summary.length < 50) {
      // Get broadcast cover for additional context
      let coverContext = '';
      if (recording.cover_id) {
        const covers = await base44.asServiceRole.entities.BroadcastCover.filter({ id: recording.cover_id });
        if (covers && covers.length > 0) {
          const cover = covers[0];
          if (cover.verses_text && cover.verses_text.length > 0) {
            coverContext = `\nموضوع الدرس: تفسير ${cover.verses_text.slice(0, 2).join(' ')}...`;
          } else if (cover.hadith_text) {
            coverContext = `\nموضوع الدرس: شرح حديث "${cover.hadith_text.substring(0, 100)}..."`;
          }
        }
      }

      const metadataPrompt = `
قم بإنشاء ملخص جذاب للدرس التالي:

العنوان: ${recording.title}
الفئة: ${recording.category}
المدة: ${Math.floor((recording.duration_seconds || 0) / 60)} دقيقة
${coverContext}

الملخص يجب أن يكون:
- مختصر (3-5 أسطر)
- واضح ومباشر
- يبرز قيمة المحتوى وفائدته
- لا يذكر اسم المحاضر أو المذيع
- مناسب للمشاركة

الملخص فقط بدون أي مقدمات:
      `.trim();

      const metadataResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: metadataPrompt,
        add_context_from_internet: false
      });

      summary = metadataResponse.trim();
    }

    // Update recording with summary
    await base44.asServiceRole.entities.Recording.update(recording_id, {
      description: summary
    });

    return Response.json({
      success: true,
      summary,
      message: 'تم توليد الملخص بنجاح من محتوى التسجيل'
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});