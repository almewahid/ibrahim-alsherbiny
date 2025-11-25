import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.400.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName') || file.name;
    const folder = formData.get('folder') || 'recordings';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Initialize S3 Client for Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: Deno.env.get('CLOUDFLARE_R2_ENDPOINT'),
      credentials: {
        accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      },
    });

    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const key = `${folder}/${Date.now()}_${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Construct public URL (if bucket is public) or return key for signed URL generation
    const publicUrl = `${Deno.env.get('CLOUDFLARE_R2_ENDPOINT')}/${bucketName}/${key}`;

    return Response.json({
      success: true,
      file_key: key,
      public_url: publicUrl,
      file_size: file.size,
      message: 'تم رفع الملف بنجاح إلى Cloudflare R2'
    });

  } catch (error) {
    console.error('Error uploading to R2:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});