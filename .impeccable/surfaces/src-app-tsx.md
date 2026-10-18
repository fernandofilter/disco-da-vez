---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Home.tsx","src/pages/Group.tsx","src/components/GroupView.tsx"]
---

# Surface brief: Disco da Vez (whole app)

Scope: every screen (Home, invite/join, group room, roulette, vote, reveal, history). Mode: Operate (state clarity first) with an Experience moment (roulette and reveal). Audience: 2-6 friends on phones, mostly evening, a shared ritual. Constraints: pt-BR copy, mobile-first, flows and data untouched, no invented claims, light CSS, Web Audio sound (no asset files) on by default with mute, 44px touch targets. The user rejected the previous valve-radio world as too decorative and disliked its teal/amber colors, so this replacement is flat, structural and light, and must not reuse teal, amber, brass, glass or radio imagery.

## Direction contract

THESIS: The group's night is a printed programming grid: every person is a channel row, every step is a time slot, and the drawn album is the prime-time program. Refuses decoration and the dark-mode music-app default.

OWN-WORLD: Cool newsprint paper (oklch ~0.965 0.007 250) with near-black ink (~0.17 0.012 262), 1px and 2px ruled lines, square-ish 2-6px corners. Colour exists only as flat channel tarjas, one per person (cobalt, tangerine, magenta, green, yellow, violet), plus a red live tally dot. One grotesque (Archivo, width axis): condensed 62% heavy caps for mastheads and headings, normal width for text. State is shape not hue: solid square done, hatched square pending, dash not applicable. Faint paper grain and a halftone dot band only.

STORY: The group sees one printed page: masthead with the group name, an AGORA line saying the one next step, the grid of who is ready or has voted, and the program of the night. They believe it is fair and clear, and act.

FIRST VIEWPORT: Phone: thin masthead strip (brand, today's date, sound), group name in condensed caps at 60-72px, a red-dot AGORA line in 36-44px caps with the next step and a row of small tarja chips showing readiness, then the active step (choice picker, vote tiles, roulette or round setup) before the people grid. Home: giant ALBUM SORT masthead, six-tarja halftone band, create-group form and saved groups as channel rows.

FORM: Grade de programação (grounded candidate 5 of my list on re-roll 1), seed key 560651fb. Raises: state as line form not colour (emission-line rail); track list as inlay with right-aligned running times and ruled lines (cassette J-card).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
