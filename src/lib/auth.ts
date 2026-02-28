import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

function getEnv(key: string): string {
  return (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key])
    ?? process.env[key]
    ?? '';
}

function getAdminSupabase() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

export type User = {
  id: number;
  username: string;
  password: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
};

const SALT_ROUNDS = 12;
const SESSION_COOKIE = 'mbg_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; 

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function getSecret(): string {
  return process.env.AUTH_SECRET ?? 'change_me_fallback_secret_32chars!!';
}

export function createSessionToken(userId: number, username: string): string {
  const payload = JSON.stringify({
    userId,
    username,
    expires: Date.now() + SESSION_DURATION_MS,
  });

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

export async function findUserByUsername(username: string): Promise<User | null> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as User;
}

export async function findUserById(id: number): Promise<User | null> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as User;
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
