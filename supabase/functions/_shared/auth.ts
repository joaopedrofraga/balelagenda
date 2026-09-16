/**
 * Shared helpers for custom auth Edge Functions.
 * JWT signed with project JWT secret so PostgREST populates auth.uid() from claim `sub`.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose@5";
import bcrypt from "npm:bcryptjs@2.4.3";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Access token TTL — sessão persistente (~30 dias). */
export const ACCESS_TOKEN_TTL_SEC = 60 * 60 * 24 * 30;

export type PublicProfile = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: "admin" | "user";
  active: boolean;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type ProfileRow = PublicProfile & {
  password_hash: string;
};

const PUBLIC_COLUMNS =
  "id, name, username, email, role, active, avatar_path, created_at, updated_at, last_login_at";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Secret/env ausente: ${name}`);
  return v;
}

export function serviceClient(): SupabaseClient {
  return createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function userClient(authHeader: string): SupabaseClient {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function toPublicProfile(row: ProfileRow | Record<string, unknown>): PublicProfile {
  return {
    id: String(row.id),
    name: String(row.name),
    username: String(row.username),
    email: (row.email as string | null) ?? null,
    role: row.role as "admin" | "user",
    active: Boolean(row.active),
    avatar_path: (row.avatar_path as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    last_login_at: (row.last_login_at as string | null) ?? null,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function signAccessToken(profile: {
  id: string;
  email: string | null;
  role: string;
}): Promise<{ token: string; expiresIn: number; expiresAt: number }> {
  const secret = new TextEncoder().encode(getEnv("JWT_SECRET"));
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = ACCESS_TOKEN_TTL_SEC;
  const expiresAt = now + expiresIn;

  const token = await new jose.SignJWT({
    role: "authenticated",
    aud: "authenticated",
    email: profile.email ?? undefined,
    app_role: profile.role,
    aal: "aal1",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(profile.id)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setIssuer("supabase")
    .sign(secret);

  return { token, expiresIn, expiresAt };
}

export async function requireAdmin(
  req: Request,
): Promise<{ profile: PublicProfile; authHeader: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Não autenticado" }, 401);
  }

  const admin = serviceClient();
  let sub: string;
  try {
    const jwt = authHeader.slice("Bearer ".length);
    const secret = new TextEncoder().encode(getEnv("JWT_SECRET"));
    const { payload } = await jose.jwtVerify(jwt, secret, {
      algorithms: ["HS256"],
    });
    if (!payload.sub || payload.role !== "authenticated") {
      return json({ error: "Sessão inválida" }, 401);
    }
    sub = payload.sub;
  } catch {
    return json({ error: "Sessão inválida" }, 401);
  }

  const { data, error } = await admin
    .from("profiles")
    .select(PUBLIC_COLUMNS)
    .eq("id", sub)
    .maybeSingle();

  if (error || !data) return json({ error: "Sessão inválida" }, 401);
  const profile = toPublicProfile(data);
  if (!profile.active || profile.role !== "admin") {
    return json({ error: "Somente administradores" }, 403);
  }
  return { profile, authHeader };
}

export async function requireActiveUser(
  req: Request,
): Promise<{ profile: PublicProfile; authHeader: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Não autenticado" }, 401);
  }

  const admin = serviceClient();
  let sub: string;
  try {
    const jwt = authHeader.slice("Bearer ".length);
    const secret = new TextEncoder().encode(getEnv("JWT_SECRET"));
    const { payload } = await jose.jwtVerify(jwt, secret, {
      algorithms: ["HS256"],
    });
    if (!payload.sub || payload.role !== "authenticated") {
      return json({ error: "Sessão inválida" }, 401);
    }
    sub = payload.sub;
  } catch {
    return json({ error: "Sessão inválida" }, 401);
  }

  const { data, error } = await admin
    .from("profiles")
    .select(PUBLIC_COLUMNS)
    .eq("id", sub)
    .maybeSingle();

  if (error || !data) return json({ error: "Sessão inválida" }, 401);
  const profile = toPublicProfile(data);
  if (!profile.active) return json({ error: "Conta inativa" }, 403);
  return { profile, authHeader };
}

/** Rate-limit simples em memória (por isolate). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

export function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "Senha deve ter pelo menos 8 caracteres";
  }
  if (password.length > 128) return "Senha muito longa";
  return null;
}

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (u.length < 3 || u.length > 32) return "Username inválido (3–32 caracteres)";
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) {
    return "Username: use letras, números, . _ -";
  }
  return null;
}

export { PUBLIC_COLUMNS };
