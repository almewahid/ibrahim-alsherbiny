import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Store active WebSocket connections
const connections = new Map();

Deno.serve(async (req) => {
  // Check if this is a WebSocket upgrade request
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let userId = null;
  let base44Client = null;

  socket.onopen = () => {
    console.log("WebSocket connection opened");
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'auth') {
        // Authenticate user
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user) {
          userId = user.id;
          base44Client = base44;
          connections.set(userId, socket);
          
          socket.send(JSON.stringify({
            type: 'auth_success',
            userId: user.id
          }));
        } else {
          socket.send(JSON.stringify({
            type: 'auth_error',
            message: 'Authentication failed'
          }));
        }
      }

      if (message.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }));
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };

  socket.onclose = () => {
    if (userId) {
      connections.delete(userId);
    }
    console.log("WebSocket connection closed");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});

// Export function to send notifications to specific users
export async function sendNotificationToUser(userId, notification) {
  const socket = connections.get(userId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'notification',
      data: notification
    }));
  }
}