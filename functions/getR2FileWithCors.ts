import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3.554.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.554.0';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { file_uri, file_url } = await req.json();

    const accessKeyId     = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const endpoint        = Deno.env.get('CLOUDFLARE_R2_ENDPOINT');
    const bucketName      = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    const hasR2Creds = accessKeyId && secretAccessKey && endpoint && bucketName;

    // ── 1. file_uri → R2 signed URL (الأولوية دائماً) ──────────────────────
    if (file_uri && hasR2Creds) {
      try {
        const s3Client = new S3Client({
          region: 'auto',
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: false,
        });

        // نظّف المسار من اسم الـ bucket إن وُجد
        const key = file_uri.replace(`${bucketName}/`, '').replace(/^\//, '');

        console.log('Generating R2 signed URL for key:', key);

        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        console.log('Signed URL generated successfully');
        return new Response(JSON.stringify({ url: signedUrl }), { status: 200, headers: corsHeaders });
      } catch (r2Err) {
        console.error('R2 signed URL failed:', r2Err.message);
        // استمر للخيارات التالية
      }
    }

    // ── 2. R2 URL مباشر + بيانات R2 → استخرج المسار وأنشئ signed URL ──────
    if (file_url && file_url.includes('r2.cloudflarestorage.com') && hasR2Creds) {
      try {
        // استخرج key من الرابط: https://endpoint/bucket/key أو https://bucket.endpoint/key
        const urlObj = new URL(file_url);
        let key = urlObj.pathname.replace(/^\//, '').replace(`${bucketName}/`, '');

        console.log('Extracted key from URL:', key);

        const s3Client = new S3Client({
          region: 'auto',
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: false,
        });

        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return new Response(JSON.stringify({ url: signedUrl }), { status: 200, headers: corsHeaders });
      } catch (err) {
        console.error('Failed to sign R2 URL from file_url:', err.message);
      }
    }

    // ── 3. أي رابط CDN عادي (base44 أو غيره) → أرجعه مباشرةً ──────────────
    if (file_url && file_url.startsWith('http') && !file_url.includes('r2.cloudflarestorage.com')) {
      return new Response(JSON.stringify({ url: file_url }), { status: 200, headers: corsHeaders });
    }

    // ── 4. Fallback → base44 signed URL للملفات الخاصة القديمة ──────────────
    if (file_uri) {
      try {
        const signedUrlResponse = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri,
          expires_in: 3600,
        });
        if (signedUrlResponse?.signed_url) {
          return new Response(JSON.stringify({ url: signedUrlResponse.signed_url }), { status: 200, headers: corsHeaders });
        }
      } catch (signErr) {
        console.error('base44 signed URL failed:', signErr.message);
      }
    }

    return new Response(
      JSON.stringify({ error: 'No valid file URL or URI provided' }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error getting file:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});