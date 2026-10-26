// Must match PROTOCOL in server/server.js.
export const PROTOCOL = 1;

// Turn what a player types ("localhost:8787", "fish.example.com", "wss://...") into a WebSocket URL.
// Secure pages (like GitHub Pages) can only open wss:// connections, except to localhost.
export function normalizeAddress(input) {
  let s = String(input ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) s = s.replace(/^http/i, 'ws');
  if (!/^wss?:\/\//i.test(s)) {
    const host = s.split('/')[0].split(':')[0];
    const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    s = `${local ? 'ws' : 'wss'}://${s}`;
  }
  try {
    const url = new URL(s);
    if (!url.port && url.protocol === 'ws:' && /^(localhost|127\.0\.0\.1)$/.test(url.hostname)) url.port = '8787';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

// Human-friendly reasons for close codes the server uses.
export const CLOSE_REASONS = {
  4000: 'Login timed out.',
  4001: 'You logged in from somewhere else.',
  4002: 'You were kicked from the server.',
  4003: 'You are banned from this server.',
  1001: 'The server shut down.',
};
