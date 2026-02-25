import { defineMiddleware } from 'astro:middleware';
import { getSessionFromRequest } from './lib/auth';

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_PATH = '/login';

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = new URL(context.request.url).pathname;

  const isDashboard = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  if (isDashboard) {
    const session = getSessionFromRequest(context.request);
    if (!session) {
      return context.redirect(`${AUTH_PATH}?redirect=${encodeURIComponent(pathname)}`);
    }
    // Inject session into locals for use in pages
    context.locals.userId = session.userId;
    context.locals.username = session.username;
  }

  return next();
});
