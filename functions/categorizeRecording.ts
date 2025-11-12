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

    // Use AI to categorize the recording
    const prompt = `
قم بتحليل المحتوى التالي وتصنيفه إلى إحدى الفئات التالية:
- علوم شرعية
- تفسير القرآن
- الحديث النبوي
- الفقه الإسلامي
- السيرة النبوية
- تربية وتزكية
- نقاش
- أخرى

معلومات التسجيل:
العنوان: ${recording.title}
الوصف: ${recording.description || 'لا يوجد'}
المحاضر: ${recording.broadcaster_name}

أجب بالفئة فقط دون أي نص إضافي.
    `.trim();

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    const suggestedCategory = aiResponse.trim();

    // Validate the category
    const validCategories = [
      'علوم شرعية',
      'تفسير القرآن',
      'الحديث النبوي',
      'الفقه الإسلامي',
      'السيرة النبوية',
      'تربية وتزكية',
      'نقاش',
      'أخرى'
    ];

    const category = validCategories.includes(suggestedCategory) 
      ? suggestedCategory 
      : 'أخرى';

    // Update recording with suggested category
    await base44.asServiceRole.entities.Recording.update(recording_id, {
      category
    });

    return Response.json({
      success: true,
      category,
      message: `تم تصنيف التسجيل كـ: ${category}`
    });

  } catch (error) {
    console.error('Error categorizing recording:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});