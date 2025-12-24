import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify OAuth Callback Handler
 * 
 * Receives the authorization code from Spotify and displays
 * the refresh token for the user to copy to their .env.local
 */

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/api/spotify/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Handle authorization errors
  if (error) {
    return new NextResponse(
      generateHTML({
        title: 'Authorization Failed',
        message: `Spotify authorization was denied: ${error}`,
        success: false,
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new NextResponse(
      generateHTML({
        title: 'Missing Code',
        message: 'No authorization code received from Spotify.',
        success: false,
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new NextResponse(
      generateHTML({
        title: 'Configuration Error',
        message: 'Spotify credentials not configured in environment variables.',
        success: false,
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    // Exchange code for tokens
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Token exchange failed:', errorData);
      return new NextResponse(
        generateHTML({
          title: 'Token Exchange Failed',
          message: `Failed to exchange authorization code: ${response.status}`,
          success: false,
        }),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const data = await response.json();

    return new NextResponse(
      generateHTML({
        title: 'Authorization Successful!',
        message: 'Copy the refresh token below to your .env.local file',
        success: true,
        refreshToken: data.refresh_token,
        accessToken: data.access_token,
        scope: data.scope,
        expiresIn: data.expires_in,
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('Callback error:', err);
    return new NextResponse(
      generateHTML({
        title: 'Error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        success: false,
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

interface HTMLOptions {
  title: string;
  message: string;
  success: boolean;
  refreshToken?: string;
  accessToken?: string;
  scope?: string;
  expiresIn?: number;
}

function generateHTML(options: HTMLOptions): string {
  const { title, message, success, refreshToken, scope } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Spotify Authorization</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #fff;
    }
    .container {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: ${success ? '#1DB954' : '#ff4444'};
    }
    p {
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 20px;
    }
    .token-box {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .token-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .token-value {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      word-break: break-all;
      color: #1DB954;
      background: rgba(0, 0, 0, 0.2);
      padding: 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .token-value:hover {
      background: rgba(29, 185, 84, 0.1);
    }
    .scope-list {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 10px;
    }
    .instructions {
      background: rgba(29, 185, 84, 0.1);
      border: 1px solid rgba(29, 185, 84, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
    }
    .instructions h3 {
      color: #1DB954;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .instructions ol {
      padding-left: 20px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }
    .instructions li {
      margin-bottom: 8px;
    }
    .instructions code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .copy-btn {
      background: #1DB954;
      color: #000;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      margin-top: 8px;
    }
    .copy-btn:hover {
      background: #1ed760;
    }
    .copied {
      color: #1DB954;
      font-size: 12px;
      margin-left: 10px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .copied.show {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    
    ${success && refreshToken ? `
    <div class="token-box">
      <div class="token-label">Refresh Token (click to copy)</div>
      <div class="token-value" onclick="copyToken(this)" title="Click to copy">
        ${refreshToken}
      </div>
      <button class="copy-btn" onclick="copyToken(document.querySelector('.token-value'))">
        Copy Token
      </button>
      <span class="copied" id="copied-msg">Copied!</span>
    </div>
    
    ${scope ? `<div class="scope-list"><strong>Granted scopes:</strong> ${scope.split(' ').join(', ')}</div>` : ''}
    
    <div class="instructions">
      <h3>Next Steps:</h3>
      <ol>
        <li>Copy the refresh token above</li>
        <li>Open your <code>.env.local</code> file</li>
        <li>Update or add: <code>SPOTIFY_REFRESH_TOKEN=&lt;paste token here&gt;</code></li>
        <li>Restart your development server</li>
        <li>Return to the Content Hub and try playback controls</li>
      </ol>
    </div>
    
    <script>
      function copyToken(element) {
        navigator.clipboard.writeText(element.textContent.trim());
        const msg = document.getElementById('copied-msg');
        msg.classList.add('show');
        setTimeout(() => msg.classList.remove('show'), 2000);
      }
    </script>
    ` : ''}
  </div>
</body>
</html>
  `.trim();
}
