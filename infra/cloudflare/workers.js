export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://portal.esim.com.mm',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const rateLimitKey = `rate_limit:${getClientIP(request)}`;
      const rateLimitCount = await env.KV.get(rateLimitKey);
      
      if (rateLimitCount && parseInt(rateLimitCount) > 100) {
        return new Response('Rate limit exceeded', { 
          status: 429,
          headers: { ...corsHeaders, 'Retry-After': '60' }
        });
      }

      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      const token = authHeader.substring(7);
      const isValidToken = await verifyJWT(token, env.JWT_SECRET);
      
      if (!isValidToken) {
        return new Response('Invalid token', { status: 401, headers: corsHeaders });
      }

      const response = await routeRequest(request, env);
      
      await env.KV.put(rateLimitKey, (parseInt(rateLimitCount) || 0) + 1, { expirationTtl: 60 });
      
      const securityHeaders = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };

      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, ...securityHeaders, ...response.headers }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};

async function routeRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/api/entitlement/')) {
    const backendUrl = `${env.AZURE_FUNCTION_URL}${path}`;
    return await fetch(backendUrl, {
      method: request.method,
      headers: {
        ...request.headers,
        'x-functions-key': env.AZURE_FUNCTION_KEY
      },
      body: request.body
    });
  }

  if (path.startsWith('/api/smdp/')) {
    const backendUrl = `${env.CONTAINER_APP_URL}${path}`;
    return await fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  }

  return new Response('Not Found', { status: 404 });
}

async function verifyJWT(token, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const [header, payload, signature] = token.split('.');
    const data = `${header}.${payload}`;
    
    const signatureBuffer = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(data)
    );
  } catch {
    return false;
  }
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For') || 
         '0.0.0.0';
}