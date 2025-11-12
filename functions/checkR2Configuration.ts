import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { S3Client, ListBucketsCommand, HeadBucketCommand } from 'npm:@aws-sdk/client-s3@3.400.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        configured: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Check if R2 credentials are configured
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    if (!accessKeyId || !secretKey || !endpoint || !bucketName) {
      return Response.json({
        configured: false,
        message: 'Cloudflare R2 is not configured. Using Base44 storage.',
        details: {
          hasAccessKey: !!accessKeyId,
          hasSecretKey: !!secretKey,
          hasEndpoint: !!endpoint,
          hasBucketName: !!bucketName
        }
      });
    }

    // Test connection to R2
    try {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretKey,
        },
      });

      // Try to access the bucket
      const headCommand = new HeadBucketCommand({
        Bucket: bucketName
      });

      await s3Client.send(headCommand);

      return Response.json({
        configured: true,
        connected: true,
        message: '✅ Cloudflare R2 مُعد ومتصل بنجاح',
        bucket: bucketName,
        endpoint: endpoint
      });

    } catch (testError) {
      console.error('R2 connection test failed:', testError);
      
      let errorMessage = 'فشل الاتصال بـ Cloudflare R2';
      
      if (testError.message.includes('InvalidAccessKeyId')) {
        errorMessage = 'مفتاح الوصول غير صحيح';
      } else if (testError.message.includes('SignatureDoesNotMatch')) {
        errorMessage = 'المفتاح السري غير صحيح';
      } else if (testError.message.includes('NoSuchBucket')) {
        errorMessage = `Bucket "${bucketName}" غير موجود`;
      }

      return Response.json({
        configured: true,
        connected: false,
        message: errorMessage,
        error: testError.message
      });
    }

  } catch (error) {
    console.error('Error checking R2 configuration:', error);
    return Response.json({ 
      configured: false,
      error: error.message 
    }, { status: 500 });
  }
});