import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.400.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        error: 'غير مصرح - يرجى تسجيل الدخول',
        success: false 
      }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName') || file?.name || 'unnamed-file';
    const folder = formData.get('folder') || 'recordings';

    if (!file) {
      return Response.json({ 
        error: 'لم يتم إرسال ملف',
        success: false 
      }, { status: 400 });
    }

    // Check if R2 credentials are configured
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    if (!accessKeyId || !secretKey || !endpoint || !bucketName) {
      return Response.json({ 
        error: 'Cloudflare R2 غير مُعد بشكل صحيح. يرجى التحقق من الإعدادات في لوحة التحكم.',
        success: false,
        details: {
          hasAccessKey: !!accessKeyId,
          hasSecretKey: !!secretKey,
          hasEndpoint: !!endpoint,
          hasBucketName: !!bucketName
        }
      }, { status: 500 });
    }

    // Initialize S3 Client for Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretKey,
      },
    });

    const key = `${folder}/${Date.now()}_${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await s3Client.send(command);

    // Construct public URL
    const publicUrl = `${endpoint}/${bucketName}/${key}`;

    return Response.json({
      success: true,
      file_key: key,
      public_url: publicUrl,
      file_size: file.size,
      bucket: bucketName,
      message: `✅ تم رفع الملف بنجاح إلى Cloudflare R2 (${(file.size / 1024 / 1024).toFixed(2)} ميجا)`
    });

  } catch (error) {
    console.error('Error uploading to R2:', error);
    
    let errorMessage = 'فشل رفع الملف إلى Cloudflare R2';
    let suggestions = [];

    if (error.message.includes('InvalidAccessKeyId')) {
      errorMessage = 'مفتاح الوصول غير صحيح';
      suggestions = [
        'تحقق من CLOUDFLARE_R2_ACCESS_KEY_ID في الإعدادات',
        'تأكد من أن المفتاح نشط في Cloudflare'
      ];
    } else if (error.message.includes('SignatureDoesNotMatch')) {
      errorMessage = 'المفتاح السري غير صحيح';
      suggestions = [
        'تحقق من CLOUDFLARE_R2_SECRET_ACCESS_KEY في الإعدادات',
        'تأكد من نسخ المفتاح بالكامل بدون مسافات'
      ];
    } else if (error.message.includes('NoSuchBucket')) {
      errorMessage = 'Bucket غير موجود';
      suggestions = [
        'تحقق من CLOUDFLARE_R2_BUCKET_NAME في الإعدادات',
        'تأكد من إنشاء الـ bucket في Cloudflare أولاً'
      ];
    } else if (error.message.includes('NetworkingError') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'فشل الاتصال بـ Cloudflare R2';
      suggestions = [
        'تحقق من اتصالك بالإنترنت',
        'تحقق من CLOUDFLARE_R2_ENDPOINT في الإعدادات'
      ];
    }

    return Response.json({ 
      error: errorMessage,
      details: error.message,
      suggestions: suggestions,
      success: false 
    }, { status: 500 });
  }
});