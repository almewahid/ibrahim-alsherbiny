import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { RtcTokenBuilder, RtcRole } from 'npm:agora-access-token@2.0.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { channelName, role, uid } = await req.json();

        if (!channelName) {
            return Response.json({ 
                error: 'Channel name is required' 
            }, { status: 400 });
        }

        const appId = Deno.env.get("AGORA_APP_ID");
        const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");

        if (!appId || !appCertificate) {
            return Response.json({ 
                error: 'Agora credentials not configured' 
            }, { status: 500 });
        }

        // Token expires in 24 hours
        const expirationTimeInSeconds = 3600 * 24;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Determine role: broadcaster (1) or audience (2)
        const userRole = role === 'broadcaster' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
        
        // Generate UID if not provided (use user.id hash)
        const userUid = uid || Math.abs(hashCode(user.id));

        // Build the token
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            userUid,
            userRole,
            privilegeExpiredTs
        );

        return Response.json({
            token,
            uid: userUid,
            appId,
            channelName,
            expiresAt: privilegeExpiredTs
        });
    } catch (error) {
        console.error('Error generating Agora token:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});

// Simple hash function to convert user ID to number
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}