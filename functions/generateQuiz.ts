import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.custom_role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id, broadcast_id, series_id, num_questions = 10, difficulty = "متوسط" } = await req.json();

    let content = "";
    let title = "";

    if (recording_id) {
      const recordings = await base44.entities.Recording.filter({ id: recording_id });
      if (recordings.length > 0) {
        const recording = recordings[0];
        title = recording.title;
        content = `عنوان: ${recording.title}\nوصف: ${recording.description || ""}`;
      }
    } else if (broadcast_id) {
      const broadcasts = await base44.entities.Broadcast.filter({ id: broadcast_id });
      if (broadcasts.length > 0) {
        const broadcast = broadcasts[0];
        title = broadcast.title;
        content = `عنوان: ${broadcast.title}\nوصف: ${broadcast.description || ""}`;
      }
    }

    const difficultyPrompts = {
      "سهل": "أسئلة سهلة ومباشرة",
      "متوسط": "أسئلة متوسطة الصعوبة تتطلب فهماً جيداً",
      "صعب": "أسئلة صعبة تتطلب تحليلاً عميقاً"
    };

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت معلم متخصص في العلوم الشرعية. قم بإنشاء ${num_questions} أسئلة ${difficultyPrompts[difficulty]} بناءً على المحتوى التالي:

${content}

متطلبات الأسئلة:
- كل سؤال يجب أن يكون واضحاً ومحدداً
- أسئلة اختيار من متعدد (4 خيارات)
- خيار واحد صحيح فقط
- أضف شرحاً مختصراً للإجابة الصحيحة
- يجب أن تكون الأسئلة متنوعة (حفظ، فهم، تطبيق)

أرجع البيانات بصيغة JSON فقط.`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" }
                },
                correct_answer: { type: "string" },
                explanation: { type: "string" }
              }
            }
          }
        }
      }
    });

    const quiz = await base44.asServiceRole.entities.Quiz.create({
      title: `اختبار: ${title}`,
      description: `اختبار تم توليده تلقائياً للمحاضرة: ${title}`,
      recording_id: recording_id || null,
      broadcast_id: broadcast_id || null,
      series_id: series_id || null,
      difficulty: difficulty,
      is_ai_generated: true,
      is_active: true,
      total_questions: response.questions.length
    });

    for (let i = 0; i < response.questions.length; i++) {
      const q = response.questions[i];
      await base44.asServiceRole.entities.QuizQuestion.create({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: "اختيار_من_متعدد",
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
        order_number: i + 1,
        points: 1
      });
    }

    return Response.json({
      success: true,
      quiz_id: quiz.id,
      message: `تم توليد ${response.questions.length} سؤال بنجاح`
    });

  } catch (error) {
    console.error('Error generating quiz:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});