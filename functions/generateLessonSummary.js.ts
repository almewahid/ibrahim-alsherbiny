import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { broadcast_id, lesson_topic, lesson_content } = await req.json();

        if (!lesson_topic) {
            throw new Error('Lesson topic is required');
        }

        // Generate summary using AI
        const summaryResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `أنت خبير في تلخيص الدروس الشرعية. 
            لخص هذا الدرس بطريقة واضحة ومختصرة:
            
            الموضوع: ${lesson_topic}
            ${lesson_content ? `المحتوى: ${lesson_content}` : ''}
            
            اكتب ملخصاً في 5-7 نقاط رئيسية.`,
            add_context_from_internet: false
        });

        const summary = summaryResponse;

        // Save summary if broadcast_id provided
        if (broadcast_id) {
            const broadcasts = await base44.entities.BroadcastCover.filter({ broadcast_id });
            if (broadcasts.length > 0) {
                await base44.entities.BroadcastCover.update(broadcasts[0].id, {
                    previous_summary: summary
                });
            }
        }

        return Response.json({
            success: true,
            summary
        });
    } catch (error) {
        console.error('Error generating summary:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});