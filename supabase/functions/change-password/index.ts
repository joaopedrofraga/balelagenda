/**
 * Edge Function: change-password
 * Usuário autenticado altera a própria senha (valida senha atual).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  hashPassword,
  json,
  requireActiveUser,
  serviceClient,
  validatePassword,
  verifyPassword,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const auth = await requireActiveUser(req);
  if (auth instanceof Response) return auth;

  try {
    const body = (await req.json()) as {
      current_password?: string;
      new_password?: string;
    };
    const current = body.current_password ?? "";
    const next = body.new_password ?? "";

    const pErr = validatePassword(next);
    if (pErr) return json({ error: pErr }, 400);

    const admin = serviceClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, password_hash")
      .eq("id", auth.profile.id)
      .maybeSingle();

    if (error || !data) return json({ error: "Usuário não encontrado" }, 404);
    if (!verifyPassword(current, data.password_hash)) {
      return json({ error: "Senha atual incorreta" }, 401);
    }

    const password_hash = await hashPassword(next);
    const { error: updErr } = await admin
      .from("profiles")
      .update({ password_hash })
      .eq("id", auth.profile.id);

    if (updErr) {
      console.error(updErr);
      return json({ error: "Falha ao alterar senha" }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Falha ao alterar senha" }, 500);
  }
});
