import type { APIRoute } from 'astro';
import { validateLogin, buildSessionCookie, createSessionToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const redirectPath = String(formData.get('redirect') ?? '/dashboard');

    if (!username || !password) {
      return redirect('/login?error=invalid');
    }

    const user = await validateLogin(username, password);

    if (!user) {
      return redirect('/login?error=invalid');
    }

    const token = createSessionToken(user.id, user.username);
    const cookie = buildSessionCookie(token);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectPath.startsWith('/') ? redirectPath : '/dashboard',
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return redirect('/login?error=server');
  }
};
