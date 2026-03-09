import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id, num_questions = 5 } = await req.json();

    if (!recording_id) {
      return Response.json({ error: 'Recording ID is required' }, { status: 400 });
    }

    const recordings = await base44.entities.Recording.filter({ id: recording_id });
    if (recordings.length === 0) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    const recording = recordings[0];

    const prompt = `أنت خبير في إنشاء اختبارات تعليمية إسلامية. بناءً على المعلومات التالية عن الدرس:

العنوان: ${recording.title}
الوصف: ${recording.description || 'غير متوفر'}
الفئة: ${recording.category || 'علوم شرعية'}
المحاضر: ${recording.broadcaster_name}

قم بإنشاء ${num_questions} أسئلة اختيار من متعدد (4 خيارات لكل سؤال) تختبر فهم الطالب.
تأكد من أن الأسئلة متنوعة وواضحة ولها إجابة واحدة صحيحة فقط مع شرح مختصر.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "number" },
                explanation: { type: "string" }
              },
              required: ["question", "options", "correct_answer"]
            }
          }
        },
        required: ["questions"]
      }
    });

    const questions = response?.questions || [];

    return Response.json({
      success: true,
      questions,
      message: `تم توليد ${questions.length} سؤال بنجاح`
    });

  } catch (error) {
    console.error('Error generating quiz:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});