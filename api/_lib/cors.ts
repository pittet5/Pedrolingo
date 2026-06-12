import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Sets CORS headers and handles OPTIONS preflight requests.
 * Returns true if the request was a preflight (caller should return early).
 */
export function setCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
