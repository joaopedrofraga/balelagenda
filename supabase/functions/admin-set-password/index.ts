/**
 * Edge Function: admin-set-password
 * Admin redefine a senha de qualquer usuário (novo password_hash).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  hashPassword,
  json,
  requireAdmin,
  serviceClient,
  validatePassword,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const body = (await req.json()) as { user_id?: string; password?: string };
    const userId = (body.user_id ?? "").trim();
    const password = body.password ?? "";

    if (!userId) return json({ error: "user_id obrigatório" }, 400);
    const pErr = validatePassword(password);
    if (pErr) return json({ error: pErr }, 400);

    const password_hash = await hashPassword(password);
    const admin = serviceClient();

    const { data, error } = await admin
      .from("profiles")
      .update({ password_hash })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(error);
      return json({ error: "Falha ao alterar senha" }, 500);
    }
    if (!data) return json({ error: "Usuário não encontrado" }, 404);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Falha ao alterar senha" }, 500);
  }
});
