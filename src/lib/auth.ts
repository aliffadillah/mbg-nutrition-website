import bcrypt from 'bcryptjs';
import { db } from '../db/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '../db/schema';

const SALT_ROUNDS = 12;
const SESSION_COOKIE = 'mbg_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Password helpers ─────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Session token (simple base64 signed payload) ────────────────────────────
function getSecret(): string {
  return process.env.AUTH_SECRET ?? 'change_me_fallback_secret_32chars!!';
}

export function createSessionToken(userId: number, username: string): string {
  const payload = JSON.stringify({
    userId,
    username,
    expires: Date.now() + SESSION_DURATION_MS,
  });
  // Simple signing: base64(payload) + "." + base64(HMAC-like check using secret)
  const encoded = Buffer.from(payload).toString('base64');
  const signature = Buffer.from(
    `${encoded}.${getSecret()}`
  ).toString('base64').slice(0, 16);
  return `${encoded}.${signature}`;
}

export function parseSessionToken(token: string): { userId: number; username: string } | null {
  try {
    const [encoded] = token.split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
    if (Date.now() > payload.expires) return null;
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
export function buildSessionCookie(token: string): string {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function buildLogoutCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getSessionFromRequest(request: Request): { userId: number; username: string } | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  }
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return parseSessionToken(token);
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0] ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function validateLogin(
  username: string,
  password: string
): Promise<User | null> {
  const user = await findUserByUsername(username);
  if (!user) return null;
  const ok = await verifyPassword(password, user.password);
  return ok ? user : null;
}
