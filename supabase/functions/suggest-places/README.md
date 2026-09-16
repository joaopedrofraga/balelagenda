# Edge Function: suggest-places

Interpreta intenção (IA ou heurística) e busca lugares reais via Places API.
Chaves secretas ficam só nos Secrets do Supabase — nunca no frontend.

## Deploy

```bash
supabase functions deploy suggest-places
```

## Secrets

```bash
supabase secrets set AI_API_KEY=sk-...
supabase secrets set PLACES_API_KEY=...
supabase secrets set PLACES_PROVIDER=geoapify
supabase secrets set DEFAULT_CITY="São Paulo, Brazil"
# opcional:
# supabase secrets set AI_BASE_URL=https://api.openai.com/v1
# supabase secrets set AI_MODEL=gpt-4o-mini
# supabase secrets set DEFAULT_LAT=-23.55
# supabase secrets set DEFAULT_LON=-46.63
```

## Teste

Com o usuário logado no app, abra **Sugestões** e envie um pedido em linguagem natural.
Sem `PLACES_API_KEY`, a function ainda devolve filtros; o app lista ideias locais compatíveis.
