exports.handler = async function(event) {
  // Handle CORS preflight
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const CLIENT_ID     = 'ZVRBOEpHUklIZEUxdzlreHBvbTA6MTpjaQ';
  const CLIENT_SECRET = 'sfbr1khb9isplH6fkk1vsjkc8XAAGPzeOD3eBroatN0zF7ATUV';
  const REDIRECT_URI  = 'https://www.thebuttonnft.click/callback';

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { code, code_verifier } = body;
  if (!code || !code_verifier) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing code or code_verifier' }) };
  }

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    // Exchange code for token
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        code,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
        code_verifier
      }).toString()
    });

    const tokenRaw = await tokenRes.text();
    console.log('Twitter token response status:', tokenRes.status);
    console.log('Twitter token response:', tokenRaw);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenRaw);
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Twitter returned non-JSON', raw: tokenRaw.slice(0, 300) }) };
    }

    if (!tokenData.access_token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No access token', detail: tokenData }) };
    }

    // Fetch user profile
    const userRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username',
      { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
    );

    const userRaw = await userRes.text();
    console.log('Twitter user response:', userRaw);

    let userData;
    try {
      userData = JSON.parse(userRaw);
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'User fetch returned non-JSON', raw: userRaw.slice(0, 300) }) };
    }

    if (!userData.data) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No user data', detail: userData }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: tokenData.access_token,
        user: userData.data
      })
    };

  } catch(e) {
    console.log('Function error:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
