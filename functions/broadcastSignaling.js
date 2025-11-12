import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Store active connections (in production, use Redis or a database)
const connections = new Map();

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, broadcastId, signal, listenerId } = await req.json();

        switch (action) {
            case 'start_broadcast':
                // Broadcaster starts streaming
                if (!connections.has(broadcastId)) {
                    connections.set(broadcastId, {
                        broadcaster: user.id,
                        listeners: new Map(),
                        signals: []
                    });
                }
                return Response.json({ 
                    success: true,
                    message: 'Broadcast started',
                    broadcastId 
                });

            case 'join_broadcast':
                // Listener joins
                const broadcast = connections.get(broadcastId);
                if (!broadcast) {
                    return Response.json({ 
                        error: 'Broadcast not found' 
                    }, { status: 404 });
                }
                
                broadcast.listeners.set(listenerId || user.id, {
                    userId: user.id,
                    joinedAt: Date.now()
                });
                
                return Response.json({ 
                    success: true,
                    listenerCount: broadcast.listeners.size
                });

            case 'send_signal':
                // WebRTC signaling
                const targetBroadcast = connections.get(broadcastId);
                if (!targetBroadcast) {
                    return Response.json({ 
                        error: 'Broadcast not found' 
                    }, { status: 404 });
                }
                
                targetBroadcast.signals.push({
                    from: user.id,
                    signal: signal,
                    timestamp: Date.now()
                });
                
                return Response.json({ success: true });

            case 'get_signals':
                // Get pending signals
                const currentBroadcast = connections.get(broadcastId);
                if (!currentBroadcast) {
                    return Response.json({ signals: [] });
                }
                
                const userSignals = currentBroadcast.signals.filter(
                    s => s.from !== user.id
                );
                
                return Response.json({ signals: userSignals });

            case 'leave_broadcast':
                // Listener leaves
                const leavingBroadcast = connections.get(broadcastId);
                if (leavingBroadcast) {
                    leavingBroadcast.listeners.delete(listenerId || user.id);
                }
                
                return Response.json({ success: true });

            case 'stop_broadcast':
                // Broadcaster stops
                connections.delete(broadcastId);
                return Response.json({ success: true });

            default:
                return Response.json({ 
                    error: 'Invalid action' 
                }, { status: 400 });
        }
    } catch (error) {
        console.error('Signaling error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});