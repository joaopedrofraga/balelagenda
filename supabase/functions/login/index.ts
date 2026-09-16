/**
 * Edge Function: login
 * Valida username/email + senha (bcrypt), emite JWT compatível com Supabase (auth.uid()).
 *
 * Secrets: JWT_SECRET (= Project Settings → API → JWT Secret)
 * verify_jwt = false (login é público)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  checkLoginRateLimit,
  corsHeaders,
  json,
  PUBLIC_COLUMNS,
  serviceClient,
  signAccessToken,
  toPublicProfile,
  verifyPassword,
  type ProfileRow,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkLoginRateLimit(`ip:${ip}`)) {
      return json({ error: "Muitas tentativas. Tente novamente em instantes." }, 429);
    }

    const body = (await req.json()) as { identifier?: string; password?: string };
    const identifier = (body.identifier ?? "").trim();
    const password = body.password ?? "";

    if (!identifier || !password) {
      return json({ error: "Usuário ou senha inválidos." }, 401);
    }

    if (!checkLoginRateLimit(`id:${identifier.toLowerCase()}`)) {
      return json({ error: "Muitas tentativas. Tente novamente em instantes." }, 429);
    }

    const admin = serviceClient();
    const selectCols = `${PUBLIC_COLUMNS}, password_hash`;

    let query = admin.from("profiles").select(selectCols);
    if (identifier.includes("@")) {
      query = query.ilike("email", identifier);
    } else {
      query = query.ilike("username", identifier);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error(error);
      return json({ error: "Usuário ou senha inválidos." }, 401);
    }

    const row = data as ProfileRow | null;
    if (!row || !row.active || !verifyPassword(password, row.password_hash)) {
      return json({ error: "Usuário ou senha inválidos." }, 401);
    }

    const { token, expiresIn, expiresAt } = await signAccessToken({
      id: row.id,
      email: row.email,
      role: row.role,
    });

    await admin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", row.id);

    const profile = toPublicProfile(row);
    profile.last_login_at = new Date().toISOString();

    return json({
      access_token: token,
      token_type: "bearer",
      expires_in: expiresIn,
      expires_at: expiresAt,
      user: profile,
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Falha no login" }, 500);
  }
});
