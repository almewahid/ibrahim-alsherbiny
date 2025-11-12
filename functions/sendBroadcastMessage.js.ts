import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { title, message, type = 'broadcast_message' } = await req.json();

        if (!title || !message) {
            throw new Error('Title and message are required');
        }

        // Get all users
        const allUsers = await base44.asServiceRole.entities.User.list();

        let sentCount = 0;

        // Send notification to all users
        for (const targetUser of allUsers) {
            if (targetUser.id !== user.id) { // Don't send to self
                try {
                    await base44.asServiceRole.entities.Notification.create({
                        user_id: targetUser.id,
                        type: type,
                        title: title,
                        message: message,
                        is_read: false
                    });
                    sentCount++;
                } catch (err) {
                    console.error(`Failed to send to user ${targetUser.id}:`, err);
                }
            }
        }

        return Response.json({
            success: true,
            message: `تم إرسال ${sentCount} إشعار`,
            sent_count: sentCount
        });
    } catch (error) {
        console.error('Error sending broadcast message:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});