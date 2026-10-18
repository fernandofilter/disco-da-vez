# Disco da Vez

Grupos de 2–6 amigos escolhem artistas ou gêneros e o site sorteia (roleta estilo CS2) ou coloca em votação um álbum para todos ouvirem.
SPA estática (Vite + React + shadcn/Tailwind) + Supabase (grupos em tempo real) + MusicBrainz/Cover Art Archive (álbuns) + Last.fm opcional (gêneros e "já escutei").

## Configurar
1. Crie um projeto no Supabase, rode `supabase/migrations/0001_init.sql` no SQL Editor e ative **Authentication → Providers → Anonymous sign-ins**.
2. `cp .env.example .env` e preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e (opcional) `VITE_LASTFM_KEY` (https://www.last.fm/api/account/create).
3. `npm install && npm run dev`. Testes: `npm test`. Deploy: Vercel (já tem `vercel.json` com o rewrite da SPA).

`/demo` (só em dev) exercita MusicBrainz + roleta sem Supabase.
