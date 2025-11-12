import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { broadcast_id, type } = await req.json();

    if (!broadcast_id) {
      return Response.json({ error: 'broadcast_id is required' }, { status: 400 });
    }

    // Get broadcast details
    const broadcasts = await base44.asServiceRole.entities.Broadcast.filter({ id: broadcast_id });
    if (!broadcasts || broadcasts.length === 0) {
      return Response.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    const broadcast = broadcasts[0];

    // Get followers
    const followers = await base44.asServiceRole.entities.Follow.filter({
      following_id: broadcast.broadcaster_id,
      notify_on_broadcast: true
    });

    let notificationsCreated = 0;

    for (const follower of followers) {
      let message = '';
      let title = '';

      if (type === 'live_starting') {
        title = 'بث مباشر الآن!';
        message = `${broadcast.broadcaster_name} بدأ بثاً مباشراً: ${broadcast.title}`;
      } else if (type === 'new_recording') {
        title = 'تسجيل جديد!';
        message = `تسجيل جديد متاح من ${broadcast.broadcaster_name}: ${broadcast.title}`;
      } else if (type === 'scheduled_reminder') {
        title = 'تذكير: بث قريباً!';
        message = `البث "${broadcast.title}" سيبدأ خلال 30 دقيقة`;
      }

      // Create notification
      await base44.asServiceRole.entities.Notification.create({
        user_id: follower.follower_id,
        type: type === 'live_starting' ? 'new_broadcast' : type === 'new_recording' ? 'new_broadcast' : 'broadcast_ended',
        title,
        message,
        broadcast_id: broadcast.id,
        broadcaster_id: broadcast.broadcaster_id,
        link: `/ListenBroadcast?id=${broadcast.id}`
      });

      notificationsCreated++;
    }

    return Response.json({
      success: true,
      notifications_sent: notificationsCreated
    });

  } catch (error) {
    console.error('Error notifying followers:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});