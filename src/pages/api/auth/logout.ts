import type { APIRoute } from 'astro';
import { buildLogoutCookie } from '../../../lib/auth';

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': buildLogoutCookie(),
    },
  });
};

// Allow GET for safety (e.g., direct link logout)
export const GET: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': buildLogoutCookie(),
    },
  });
};
