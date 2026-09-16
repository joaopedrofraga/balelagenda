/**
 * Edge Function: suggest-places
 *
 * Fluxo (spec §36–40):
 * 1) Interpreta intenção do usuário (IA ou heurística local)
 * 2) Busca estabelecimentos reais via PlacesProvider (nunca inventa lugares)
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *   AI_API_KEY          — OpenAI ou compatível (opcional)
 *   AI_BASE_URL         — default https://api.openai.com/v1
 *   AI_MODEL            — default gpt-4o-mini
 *   PLACES_API_KEY      — Geoapify Places (opcional)
 *   PLACES_PROVIDER     — geoapify | none (default geoapify)
 *   DEFAULT_CITY        — ex.: São Paulo, BR (fallback de localização)
 *   DEFAULT_LAT / DEFAULT_LON — centro de busca (opcional)
 *
 * Chaves NUNCA vão no browser — só aqui.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type IntentFilters = {
  category: string | null;
  max_price: number | null;
  group_size: number | null;
  period: "morning" | "afternoon" | "night" | "any" | null;
  ambiance: string | null;
  query: string | null;
  city: string | null;
};

type PlaceResult = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  rating: number | null;
  price_level: number | null;
  url: string | null;
  provider: string;
};

type SuggestResponse = {
  filters: IntentFilters;
  places: PlaceResult[];
  source: {
    intent: "ai" | "heuristic";
    places: string;
  };
  message?: string;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const jwt = authHeader.slice("Bearer ".length);
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1] ?? "")) as { sub?: string };
      userId = payload.sub ?? null;
    } catch {
      userId = null;
    }
    if (!userId) {
      return json({ error: "Sessão inválida" }, 401);
    }

    // Auth custom (JWT HS256 do projeto) — valida via PostgREST + RLS (auth.uid())
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: me, error: meError } = await supabase
      .from("profiles")
      .select("id, active")
      .eq("id", userId)
      .eq("active", true)
      .maybeSingle();
    if (meError || !me) {
      return json({ error: "Sessão inválida" }, 401);
    }

    const body = (await req.json()) as {
      prompt?: string;
      filters?: Partial<IntentFilters>;
      limit?: number;
    };

    const prompt = (body.prompt ?? "").trim();
    const limit = Math.min(Math.max(body.limit ?? 8, 1), 20);

    let filters: IntentFilters;
    let intentSource: "ai" | "heuristic" = "heuristic";

    if (body.filters && Object.keys(body.filters).length > 0 && !prompt) {
      filters = normalizeFilters(body.filters);
    } else if (prompt) {
      const ai = await parseIntentWithAi(prompt);
      if (ai) {
        filters = ai;
        intentSource = "ai";
      } else {
        filters = parseIntentHeuristic(prompt);
      }
    } else {
      return json({ error: "Informe um pedido em texto ou filtros" }, 400);
    }

    const placesResult = await searchPlaces(filters, limit);

    const response: SuggestResponse = {
      filters,
      places: placesResult.places,
      source: { intent: intentSource, places: placesResult.provider },
      message: placesResult.message,
    };

    return json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return json({ error: message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeFilters(raw: Partial<IntentFilters>): IntentFilters {
  const period = raw.period;
  const validPeriod =
    period === "morning" ||
    period === "afternoon" ||
    period === "night" ||
    period === "any"
      ? period
      : null;

  return {
    category: raw.category?.trim() || null,
    max_price: typeof raw.max_price === "number" ? raw.max_price : null,
    group_size: typeof raw.group_size === "number" ? raw.group_size : null,
    period: validPeriod,
    ambiance: raw.ambiance?.trim() || null,
    query: raw.query?.trim() || null,
    city: raw.city?.trim() || null,
  };
}

async function parseIntentWithAi(prompt: string): Promise<IntentFilters | null> {
  const apiKey = Deno.env.get("AI_API_KEY");
  if (!apiKey) return null;

  const baseUrl = (Deno.env.get("AI_BASE_URL") ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";

  const system = `Você extrai filtros estruturados para busca de lugares de lazer/comida.
Responda SOMENTE JSON válido, sem markdown, no formato:
{"category":"restaurant|cafe|bar|park|cinema|bowling|karaoke|other|null","max_price":number|null,"group_size":number|null,"period":"morning|afternoon|night|any|null","ambiance":string|null,"query":string|null,"city":string|null}
category deve ser um termo útil para busca de lugares. query é texto curto de busca (ex.: "hambúrguer", "churrasco").
Não invente nomes de estabelecimentos.`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return null;
    const parsed = JSON.parse(content) as Partial<IntentFilters>;
    return normalizeFilters(parsed);
  } catch {
    return null;
  }
}

function parseIntentHeuristic(prompt: string): IntentFilters {
  const lower = prompt.toLowerCase();

  let category: string | null = null;
  if (/restaurante|comida|jantar|almo[cç]o|comer/.test(lower)) category = "restaurant";
  else if (/caf[eé]|coffee/.test(lower)) category = "cafe";
  else if (/bar|choppe|cerveja|drinks?/.test(lower)) category = "bar";
  else if (/parque|ar livre|picnic/.test(lower)) category = "park";
  else if (/cinema|filme/.test(lower)) category = "cinema";
  else if (/boliche|bowling/.test(lower)) category = "bowling";
  else if (/karaok[eê]/.test(lower)) category = "karaoke";
  else if (/hamb[uú]rguer|burger/.test(lower)) category = "restaurant";
  else if (/pizza/.test(lower)) category = "restaurant";
  else if (/churrasco|churras/.test(lower)) category = "restaurant";

  const priceMatch = lower.match(/(?:r\$\s*|até\s+|ate\s+|max(?:imo)?\s*)(\d{1,4})/);
  const max_price = priceMatch ? Number(priceMatch[1]) : null;

  const sizeMatch = lower.match(/(\d{1,2})\s*(?:pessoas|amigos|gente)/);
  const group_size = sizeMatch ? Number(sizeMatch[1]) : null;

  let period: IntentFilters["period"] = null;
  if (/manh[aã]/.test(lower)) period = "morning";
  else if (/tarde/.test(lower)) period = "afternoon";
  else if (/noite|nocturn|happy hour/.test(lower)) period = "night";

  let ambiance: string | null = null;
  if (/calmo|tranquilo|sossego/.test(lower)) ambiance = "calmo";
  else if (/animado|festa|barulhent/.test(lower)) ambiance = "animado";
  else if (/interno|fechado|ar.?condicionado/.test(lower)) ambiance = "interno";
  else if (/externo|ao ar livre|varanda/.test(lower)) ambiance = "externo";

  const cityMatch = prompt.match(
    /(?:em|no|na|em\s+)\s*([A-ZÁÉÍÓÚÂÊÔÃÕ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][\wÀ-ÿ]+){0,2})/,
  );
  const city = cityMatch?.[1] ?? Deno.env.get("DEFAULT_CITY") ?? null;

  const queryBits: string[] = [];
  if (/hamb[uú]rguer|burger/.test(lower)) queryBits.push("hamburguer");
  if (/pizza/.test(lower)) queryBits.push("pizza");
  if (/churrasco|churras/.test(lower)) queryBits.push("churrasco");
  if (/japon[eê]s|sushi/.test(lower)) queryBits.push("japones");
  if (/italiana?/.test(lower)) queryBits.push("italiana");
  if (queryBits.length === 0 && category) queryBits.push(category);

  return {
    category,
    max_price,
    group_size,
    period,
    ambiance,
    query: queryBits.join(" ") || prompt.slice(0, 80),
    city,
  };
}

async function searchPlaces(
  filters: IntentFilters,
  limit: number,
): Promise<{ places: PlaceResult[]; provider: string; message?: string }> {
  const provider = (Deno.env.get("PLACES_PROVIDER") ?? "geoapify").toLowerCase();
  const apiKey = Deno.env.get("PLACES_API_KEY");

  if (!apiKey || provider === "none") {
    return {
      places: [],
      provider: "none",
      message:
        "Busca de lugares não configurada. Defina PLACES_API_KEY (e opcionalmente PLACES_PROVIDER) nos secrets da Edge Function. Os filtros interpretados ainda podem ser usados no app.",
    };
  }

  if (provider === "geoapify") {
    return searchGeoapify(filters, limit, apiKey);
  }

  return {
    places: [],
    provider,
    message: `Provedor de lugares "${provider}" não suportado. Use geoapify.`,
  };
}

async function searchGeoapify(
  filters: IntentFilters,
  limit: number,
  apiKey: string,
): Promise<{ places: PlaceResult[]; provider: string; message?: string }> {
  const categories = mapCategoryToGeoapify(filters.category);
  const text = [filters.query, filters.ambiance].filter(Boolean).join(" ").trim();
  const city = filters.city || Deno.env.get("DEFAULT_CITY") || "São Paulo, Brazil";

  const lat = Deno.env.get("DEFAULT_LAT");
  const lon = Deno.env.get("DEFAULT_LON");

  const params = new URLSearchParams({
    apiKey,
    limit: String(limit),
    lang: "pt",
  });

  if (categories) params.set("categories", categories);
  if (text) params.set("text", text);

  let url: string;
  if (lat && lon) {
    params.set("filter", `circle:${lon},${lat},12000`);
    params.set("bias", `proximity:${lon},${lat}`);
    url = `https://api.geoapify.com/v2/places?${params}`;
  } else {
    // Geocode city then search
    const geoParams = new URLSearchParams({
      text: city,
      apiKey,
      limit: "1",
      lang: "pt",
      format: "json",
    });
    const geoRes = await fetch(
      `https://api.geoapify.com/v1/geocode/search?${geoParams}`,
    );
    if (!geoRes.ok) {
      return {
        places: [],
        provider: "geoapify",
        message: "Falha ao geocodificar a cidade para busca de lugares.",
      };
    }
    const geoData = await geoRes.json();
    const feature = geoData?.features?.[0];
    const coords = feature?.geometry?.coordinates as number[] | undefined;
    const cLon = coords?.[0] ?? feature?.properties?.lon;
    const cLat = coords?.[1] ?? feature?.properties?.lat;

    if (cLat == null || cLon == null) {
      return {
        places: [],
        provider: "geoapify",
        message: `Não foi possível localizar "${city}". Ajuste DEFAULT_CITY ou DEFAULT_LAT/DEFAULT_LON.`,
      };
    }

    params.set("filter", `circle:${cLon},${cLat},15000`);
    params.set("bias", `proximity:${cLon},${cLat}`);
    url = `https://api.geoapify.com/v2/places?${params}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    return {
      places: [],
      provider: "geoapify",
      message: `Erro na API de lugares: ${res.status} ${errText.slice(0, 200)}`,
    };
  }

  const data = await res.json();
  const features = (data?.features ?? []) as Array<{
    properties?: Record<string, unknown>;
    geometry?: { coordinates?: number[] };
  }>;

  const places: PlaceResult[] = features.map((f, idx) => {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    const name = String(p.name ?? p.address_line1 ?? `Lugar ${idx + 1}`);
    const cats = Array.isArray(p.categories)
      ? (p.categories as string[]).join(", ")
      : typeof p.categories === "string"
        ? p.categories
        : filters.category;

    return {
      id: String(p.place_id ?? p.osm_id ?? `${name}-${idx}`),
      name,
      category: cats || null,
      address: String(p.formatted ?? p.address_line1 ?? "") || null,
      lat: coords?.[1] ?? (typeof p.lat === "number" ? p.lat : null),
      lon: coords?.[0] ?? (typeof p.lon === "number" ? p.lon : null),
      rating: typeof p.rating === "number" ? p.rating : null,
      price_level: mapPriceFilter(filters.max_price),
      url: typeof p.website === "string" ? p.website : null,
      provider: "geoapify",
    };
  });

  // Soft filter by max_price when API doesn't expose price (client still sees intent)
  return { places, provider: "geoapify" };
}

function mapCategoryToGeoapify(category: string | null): string | null {
  if (!category) return "catering.restaurant,catering.cafe,entertainment";
  const map: Record<string, string> = {
    restaurant: "catering.restaurant,catering.fast_food",
    cafe: "catering.cafe",
    bar: "catering.bar,catering.pub",
    park: "leisure.park",
    cinema: "entertainment.cinema",
    bowling: "entertainment.bowling_alley",
    karaoke: "entertainment",
    other: "catering,entertainment,leisure",
  };
  return map[category.toLowerCase()] ?? "catering,entertainment";
}

function mapPriceFilter(maxPrice: number | null): number | null {
  if (maxPrice == null) return null;
  if (maxPrice <= 40) return 1;
  if (maxPrice <= 80) return 2;
  if (maxPrice <= 150) return 3;
  return 4;
}
