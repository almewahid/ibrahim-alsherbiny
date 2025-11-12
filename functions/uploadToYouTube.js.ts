import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recording_id } = await req.json();

        if (!recording_id) {
            throw new Error('Recording ID is required');
        }

        // Get recording details
        const recording = await base44.entities.Recording.filter({ id: recording_id });
        if (recording.length === 0) {
            throw new Error('Recording not found');
        }

        const rec = recording[0];

        // Note: Actual YouTube API integration requires OAuth2 setup
        // This is a placeholder that returns the steps needed
        
        return Response.json({
            success: true,
            message: 'لرفع التسجيل على يوتيوب، اتبع الخطوات التالية:',
            steps: [
                '1. افتح YouTube Studio',
                '2. انقر على "إنشاء" → "رفع فيديو"',
                `3. اختر الملف: ${rec.title}`,
                '4. أضف العنوان والوصف',
                '5. اختر الخصوصية (عام/غير مدرج/خاص)',
                '6. انشر الفيديو'
            ],
            recording_url: rec.file_url,
            download_instructions: 'يمكنك تحميل الملف من صفحة التسجيلات ثم رفعه يدوياً'
        });
    } catch (error) {
        console.error('Error uploading to YouTube:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});