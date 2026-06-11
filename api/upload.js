/**
 * DAITRA Serverless Upload Proxy
 * Receives raw binary file data and forwards it to Supabase Storage or tmpfiles.org.
 * Prevents CORS blocking by acting as a server-side proxy.
 */

export const config = {
  api: {
    bodyParser: false, // Disable built-in Vercel body parser to receive raw stream
  },
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filename = req.query.filename || 'upload.jpg';
    const contentType = req.headers['content-type'] || 'image/jpeg';

    const buffer = await getRawBody(req);
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'No file data received.' });
    }

    // Try uploading to Supabase if credentials exist on the server
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const bucketName = 'daitra_media';
        const fileName = `${Date.now()}_${filename.replace(/\s+/g, '_')}`;

        // Create bucket if it doesn't exist
        const headers = {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        };
        await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: bucketName,
            name: bucketName,
            public: true,
            file_size_limit: 52428800,
            allowed_mime_types: ['image/*', 'video/*']
          })
        });

        // Upload file
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': contentType
          },
          body: buffer
        });

        if (uploadRes.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
          return res.json({ url: publicUrl });
        }
      } catch (err) {
        console.error("Serverless Supabase Storage upload failed, falling back:", err);
      }
    }

    // Fallback: Upload to tmpfiles.org
    const formData = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    formData.append('file', blob, filename);

    const tmpfilesRes = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    if (tmpfilesRes.ok) {
      const json = await tmpfilesRes.json();
      if (json && json.status === 'success' && json.data && json.data.url) {
        const directUrl = json.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
        return res.json({ url: directUrl });
      }
    }

    return res.status(500).json({ error: 'Failed to upload file to online storage.' });
  } catch (err) {
    console.error("Serverless upload API error:", err);
    res.status(500).json({ error: err.message });
  }
}
