---
name: Album Sort
description: Dark listening room where the album cover is the only light and a violet needle marks the decision.
colors:
  amethyst: "oklch(0.72 0.19 295)"
  amethyst-ink: "oklch(0.12 0.02 295)"
  graphite-violet: "oklch(0.13 0.012 285)"
  graphite-card: "oklch(0.18 0.015 285)"
  graphite-raised: "oklch(0.269 0 0)"
  graphite-popover: "oklch(0.205 0 0)"
  paper-white: "oklch(0.985 0 0)"
  ash: "oklch(0.708 0 0)"
  hairline: "oklch(1 0 0 / 10%)"
  field-line: "oklch(1 0 0 / 15%)"
  alarm: "oklch(0.704 0.191 22.216)"
  crown-amber: "#fbbf24"
typography:
  display:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.amethyst}"
    textColor: "{colors.amethyst-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-primary-lg:
    backgroundColor: "{colors.amethyst}"
    textColor: "{colors.amethyst-ink}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 10px"
  button-secondary:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  card:
    backgroundColor: "{colors.graphite-card}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  member-row:
    backgroundColor: "{colors.graphite-card}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  roulette-frame:
    backgroundColor: "{colors.graphite-card}"
    rounded: "{rounded.2xl}"
    height: "176px"
---

# Design System: Album Sort

## Overview

**Creative North Star: "The Listening Room"**

A dark, quiet room where the album cover is the only light source. The interface is a low-lit graphite shell tinted faintly violet; everything that is not the music steps back. Color is rationed: a single amethyst accent marks the one thing that matters on a screen at that moment (the roulette needle, the leader's primary action, the vote you cast). Typography is plain and confident, one family, no ornament. The product's drama lives in the roulette and the reveal, not in the chrome around them.

The system is dark-only by design: the `html` element carries the `dark` class permanently and `color-scheme: dark` is set globally. It is built for phones held in a dim living room, at a gathering, with friends beside you. Density is comfortable and touch-sized; most screens are a single column of sections that never exceeds a 56rem reading width.

**Key Characteristics:**
- Dark graphite with a violet undertone (hue 285), never pure black and never a light mode.
- One accent (amethyst, hue 295), used sparingly and with a glow only at moments of decision.
- Covers are the imagery; ornament is almost nonexistent.
- Flat, tonal surfaces with 1px translucent rings instead of drop shadows.
- Rounded but not pillowy: 10px controls, 14px cards, 18px for the roulette frame.
- Motion is spring-based and purposeful: entrances, the reveal, the vote tick.

## Colors

A violet-tinted graphite room lit by a single amethyst lamp.

### Primary
- **Amethyst** (oklch(0.72 0.19 295)): The only accent. Primary buttons, the roulette needle and its glow, the selected vote ring, the winning cover's halo, the spinning disc hub, avatar tint (at 15% alpha), and the focus ring. Its rarity is the point.
- **Amethyst Ink** (oklch(0.12 0.02 295)): Text on any amethyst fill.

### Neutral
- **Graphite Violet** (oklch(0.13 0.012 285)): Page background, matched by the browser `theme-color` (#13111a).
- **Graphite Card** (oklch(0.18 0.015 285)): Cards, member rows, vote tiles, the roulette frame (at 60% alpha).
- **Graphite Raised** (oklch(0.269 0 0)): Secondary buttons, muted fills, hover states, badges.
- **Graphite Popover** (oklch(0.205 0 0)): Popovers, menus, and dialogs.
- **Paper White** (oklch(0.985 0 0)): Primary text.
- **Ash** (oklch(0.708 0 0)): Secondary text, hints, metadata, placeholders.
- **Hairline** (oklch(1 0 0 / 10%)): Borders and the 1px card ring.
- **Field Line** (oklch(1 0 0 / 15%)): Input borders.

### Semantic
- **Alarm** (oklch(0.704 0.191 22.216)): Destructive actions ("Remover", "Sair do grupo") and invalid fields; used as low-alpha fills with Alarm text.
- **Crown Amber** (#fbbf24): The leader crown icon only.
- **Rarity Strip** (#71717a, #3b82f6, #8b5cf6, #d946ef, #ef4444, #eab308): A 4px bottom edge on each roulette cover, assigned deterministically per album. A deliberate nod to loot-box rarity; it appears nowhere else.

### Named Rules
**The One Lamp Rule.** Amethyst is the only accent. If two things on a screen are amethyst, one of them is wrong. The roulette needle, the leader's current action, or the selected vote: pick one.
**The Cover Is The Light Rule.** Saturated color comes from album covers. The interface never competes with a cover for chroma.

## Typography

**Display Font:** Geist Variable (sans-serif fallback)
**Body Font:** Geist Variable (sans-serif fallback)

**Character:** A single neutral geometric sans carries everything. Hierarchy comes from weight and size, never from a second family.

### Hierarchy
- **Display** (800, 3rem/48px at sm and up, 2.25rem/36px on mobile, line-height 1, tracking -0.025em): The wordmark "Album Sort" on the home page.
- **Headline** (700, 1.875rem/30px, 1.2): The group name and the revealed album title (1.5rem on mobile).
- **Title** (600, 1.125rem/18px): Section headings ("Pessoas", "Nova rodada", "Votação").
- **Body** (400, 0.875rem/14px, 1.5): Default text, lists, tracklist. Inputs use 1rem on mobile to avoid zoom, 0.875rem from md.
- **Label** (500, 0.75rem to 0.875rem): Badges, button text (0.875rem/500), metadata.

### Named Rules
**The Numbers Align Rule.** Durations and track numbers use tabular numerals so columns stay in line.

## Layout

A single centered column, `max-width: 56rem` (max-w-4xl), 16px side gutters, 24px (mobile) to 40px vertical padding. Sections stack with 32px gaps; each section is a title, an optional muted hint, then content at a 12px gap. Members flow in a 1, 2, then 3 column grid; vote candidates in 2 then 3 columns. The home page is a split hero on md and up (wordmark left, forms right), stacked on mobile. Spacing is Tailwind's 4px base; use the existing rhythm: 8px between related controls, 12px between hint and content, 24px within cards, 32px between sections. Touch targets: primary actions use the 36px large button; secondary icon buttons are 28 to 32px and should be treated as the floor, not the target.

## Elevation & Depth

Hybrid, but mostly flat. Surfaces are tonal (background, card, raised) separated by a 1px translucent ring (`ring-1 ring-foreground/10`). Shadows are reserved for moments of decision and are colored, not black.

### Shadow Vocabulary
- **Needle Glow** (`box-shadow: 0 0 14px 2px <amethyst>`): The roulette's center line.
- **Winner Halo** (`box-shadow: 0 0 32px -4px <amethyst>`, scale 1.05): The cover that stopped under the needle.
- **Vote Halo** (`box-shadow: 0 0 28px -6px <amethyst>` plus a 2px amethyst ring): The tile you voted for.
- **Cover Lift** (`shadow-2xl` tinted amethyst at 20%): The revealed album's cover.
- **Disc Glow** (`0 0 60px -10px <amethyst>`): The spinning disc on the home page.
- **Menu Float** (`shadow-xl`): The member options popover.

### Named Rules
**The Glow Is An Event Rule.** A violet glow appears only when something has been decided or is being decided. Never on idle resting surfaces.

## Shapes

Rounded, practical, consistent. A single `--radius` of 0.625rem (10px) derives the scale: sm 6px, md 8px, lg 10px, xl 14px, 2xl 18px. Controls (buttons, inputs, segmented options) are 10px (or 8px inside the segmented control); cards, member rows, vote tiles and the album cover are 14px; the roulette frame is 18px. Avatars and the vote tick are full circles. The disc motif (conic gradient plus a hub and a spindle hole) is the brand's only recurring geometry.

## Components

### Buttons
- **Shape:** 10px radius, 32px tall by default, 36px for the primary "large" action, 28px small, 24px extra-small; icon buttons are square.
- **Primary:** Amethyst fill with Amethyst Ink text, 80% opacity on hover; used for the single leading action in a section.
- **Secondary:** Graphite Raised fill, Paper White text; a 5% foreground mix on hover.
- **Outline:** Transparent-ish fill (input at 30% alpha) with a Field Line border; used for copy invite, "Voltar às escolhas".
- **Ghost / Destructive / Link:** Ghost for menu rows; destructive is an Alarm tint at 10 to 20%; link is amethyst text.
- **Focus / Active:** A 3px ring in amethyst at 50% plus a 1px translate-down on press. Disabled drops to 50% opacity.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Graphite Card with a 1px foreground ring at 10%.
- **Internal Padding:** 16px (comfortable), 12px for the small size; the album card uses 16 to 20px.
- **Shadow Strategy:** None at rest (see Elevation).

### Inputs / Fields
- **Style:** 32px tall, 10px radius, transparent fill with a Field Line border in dark (input at 30% alpha).
- **Focus:** Border shifts to ring color and a 3px amethyst ring at 50%.
- **Error / Disabled:** Alarm border with a 20 to 40% Alarm ring; disabled at 50% opacity.

### Segmented Choice (mode and kind selectors)
Two-up grid inside a 14px-radius container with a 40% background wash; the selected option fills amethyst, the other is muted text that brightens on hover. It is an `aria-pressed` button pair, not tabs.

### Member Row
A 14px-radius card row with a 36px amethyst-tinted initial avatar, name with a Crown Amber crown for the leader, optional Last.fm line, a status badge ("Pronto", "Votou", "Aguardando"), and an overflow menu.

### Roulette (signature)
A 176px-tall, 18px-radius frame holding a horizontal strip of 132px covers separated by 10px, edge-masked to transparent at both ends. A 2px amethyst needle with a glow runs through the center, capped by amethyst triangles at top and bottom. The strip accelerates and decelerates over 7s (ease `[0.1, 0.75, 0.12, 1]`), then non-winners fade to 30% opacity and 50% saturation while the winner scales to 1.05 with a Winner Halo. Each cover carries a 4px rarity edge. Respects `prefers-reduced-motion` by jumping to the result.

### Album Card (signature)
A card with a 260px cover (14px radius, Cover Lift) beside the title, artist, meta line, genre badges, streaming link buttons, and a collapsible tracklist (max 64 height, scroll). It enters with a spring (stiffness 160, damping 18) from 24px below.

### Vote Tile
A cover-forward tile (title and artist beneath) in a 2 or 3 column grid; staggered spring entrance, lifts 4px on hover, shrinks to 0.97 on press. The chosen tile gets the Vote Halo and an amethyst tick badge top-right.

## Do's and Don'ts

### Do:
- **Do** let the album cover be the brightest, most colorful object on screen.
- **Do** keep amethyst to one purpose per screen (The One Lamp Rule).
- **Do** use the 14px / 10px radius pair and the 1px translucent ring for surfaces.
- **Do** use springs for entrances and the 7s deceleration curve for the roulette; honor `prefers-reduced-motion`.
- **Do** keep copy in informal Brazilian Portuguese with progressive verbs for waiting states ("Garimpando álbuns 2/6…").
- **Do** keep the page single-column and phone-first, touch targets at least 32px.

### Don't:
- **Don't** introduce a light theme, a second accent hue, or a gradient text treatment.
- **Don't** add decorative glows to resting surfaces; glow marks a decision.
- **Don't** use pure black or pure white backgrounds; stay on the violet-tinted graphite.
- **Don't** add a second typeface or serif display for flavor.
- **Don't** use identical icon-plus-heading-plus-blurb card grids; the product is sections and covers, not feature tiles.
- **Don't** hide state: whose turn it is, who is ready, and who has voted must always be visible.
