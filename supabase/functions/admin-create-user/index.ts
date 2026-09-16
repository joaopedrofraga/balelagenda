/**
 * Edge Function: admin-create-user
 * Admin autenticado cria usuário com senha definida (grava password_hash).
 * verify_jwt = false — validamos JWT manualmente com JWT_SECRET.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  hashPassword,
  json,
  PUBLIC_COLUMNS,
  requireAdmin,
  serviceClient,
  toPublicProfile,
  validatePassword,
  validateUsername,
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
    const body = (await req.json()) as {
      name?: string;
      username?: string;
      email?: string | null;
      password?: string;
      role?: "admin" | "user";
      add_to_default_group?: boolean;
    };

    const name = (body.name ?? "").trim();
    const username = (body.username ?? "").trim();
    const email = body.email?.trim() ? body.email.trim().toLowerCase() : null;
    const password = body.password ?? "";
    const role = body.role === "admin" ? "admin" : "user";

    if (!name) return json({ error: "Nome obrigatório" }, 400);
    const uErr = validateUsername(username);
    if (uErr) return json({ error: uErr }, 400);
    const pErr = validatePassword(password);
    if (pErr) return json({ error: pErr }, 400);

    const password_hash = await hashPassword(password);
    const admin = serviceClient();

    const { data, error } = await admin
      .from("profiles")
      .insert({
        name,
        username,
        email,
        password_hash,
        role,
        active: true,
      })
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return json({ error: "Username ou e-mail já existe" }, 409);
      }
      console.error(error);
      return json({ error: "Falha ao criar usuário" }, 500);
    }

    if (body.add_to_default_group !== false) {
      const { data: group } = await admin
        .from("groups")
        .select("id")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (group?.id) {
        await admin.from("group_members").upsert(
          {
            group_id: group.id,
            user_id: data.id,
            role: "member",
            active: true,
          },
          { onConflict: "group_id,user_id" },
        );
      }
    }

    return json({ user: toPublicProfile(data) }, 201);
  } catch (err) {
    console.error(err);
    return json({ error: "Falha ao criar usuário" }, 500);
  }
});
