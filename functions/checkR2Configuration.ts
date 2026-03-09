import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if R2 credentials are configured
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    const configured = !!(accessKeyId && secretKey && endpoint && bucketName);

    return Response.json({
      configured,
      message: configured 
        ? 'Cloudflare R2 is configured and ready to use' 
        : 'Cloudflare R2 is not configured. Using Base44 storage.',
      details: configured ? {
        endpoint: endpoint,
        bucket: bucketName
      } : null
    });

  } catch (error) {
    console.error('Error checking R2 configuration:', error);
    return Response.json({ 
      configured: false,
      error: error.message 
    }, { status: 500 });
  }
});