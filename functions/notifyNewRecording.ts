import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const data = payload.data;

    if (!data || !data.broadcaster_id) {
      return Response.json({ skipped: true, reason: "no broadcaster_id" });
    }

    const followers = await base44.asServiceRole.entities.Follow.filter({
      following_id: data.broadcaster_id,
      notify_on_broadcast: true
    });

    if (followers.length === 0) {
      return Response.json({ success: true, notifications_sent: 0 });
    }

    let count = 0;
    for (const follower of followers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: follower.follower_id,
        type: 'new_broadcast',
        title: 'درس جديد متاح! 🎙️',
        message: `تمت إضافة درس جديد: ${data.title || "درس جديد"}`,
        broadcaster_id: data.broadcaster_id,
        link: `/RecordingDetails?id=${data.id}`
      });
      count++;
    }

    return Response.json({ success: true, notifications_sent: count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});