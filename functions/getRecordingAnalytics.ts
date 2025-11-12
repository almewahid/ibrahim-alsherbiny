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

    // Get listener stats for this broadcast
    const listenerStats = await base44.asServiceRole.entities.ListenerStats.filter({
      broadcast_id: recording.broadcast_id
    });

    // Calculate engagement metrics
    const totalStats = listenerStats.length;
    const avgListeners = totalStats > 0
      ? listenerStats.reduce((sum, stat) => sum + (stat.active_listeners || 0), 0) / totalStats
      : 0;

    const peakListeners = recording.peak_listeners || 0;

    // Find peak listening hours
    const hourlyStats = {};
    listenerStats.forEach(stat => {
      if (stat.timestamp) {
        const hour = new Date(stat.timestamp).getHours();
        if (!hourlyStats[hour]) {
          hourlyStats[hour] = { count: 0, listeners: 0 };
        }
        hourlyStats[hour].count++;
        hourlyStats[hour].listeners += stat.active_listeners || 0;
      }
    });

    const peakHours = Object.entries(hourlyStats)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgListeners: data.count > 0 ? data.listeners / data.count : 0
      }))
      .sort((a, b) => b.avgListeners - a.avgListeners)
      .slice(0, 3);

    // Calculate engagement rate
    const engagementRate = peakListeners > 0
      ? ((avgListeners / peakListeners) * 100).toFixed(1)
      : 0;

    // Get views over time (simulated)
    const daysAgo = Math.floor((Date.now() - new Date(recording.created_date).getTime()) / (1000 * 60 * 60 * 24));
    const avgViewsPerDay = daysAgo > 0 ? (recording.views_count / daysAgo).toFixed(1) : recording.views_count;

    return Response.json({
      success: true,
      analytics: {
        title: recording.title,
        broadcaster_name: recording.broadcaster_name,
        duration_minutes: Math.floor((recording.duration_seconds || 0) / 60),
        recorded_at: recording.recorded_at || recording.created_date,
        
        // Engagement metrics
        total_views: recording.views_count || 0,
        peak_listeners: peakListeners,
        avg_listeners: Math.round(avgListeners),
        engagement_rate: parseFloat(engagementRate),
        
        // Time-based analytics
        days_since_recording: daysAgo,
        avg_views_per_day: parseFloat(avgViewsPerDay),
        peak_hours: peakHours.map(h => ({
          hour: h.hour,
          time: `${h.hour}:00`,
          avgListeners: Math.round(h.avgListeners)
        })),
        
        // File info
        file_size_mb: recording.file_size_mb || 0,
        
        // Listener engagement timeline
        engagement_timeline: listenerStats.map(stat => ({
          timestamp: stat.timestamp,
          active_listeners: stat.active_listeners || 0
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      }
    });

  } catch (error) {
    console.error('Error getting recording analytics:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});