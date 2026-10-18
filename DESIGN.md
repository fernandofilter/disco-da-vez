---
name: Disco da Vez
description: A printed TV-programming grid for a group's album night. Newsprint, ink rules, and one blue for you.
colors:
  paper: "oklch(0.965 0.007 250)"
  card: "oklch(0.99 0.004 250)"
  popover: "oklch(0.995 0.003 250)"
  ink: "oklch(0.17 0.012 262)"
  ink-soft: "oklch(0.42 0.015 262)"
  paper-ink: "oklch(0.985 0.004 250)"
  muted: "oklch(0.93 0.008 250)"
  secondary: "oklch(0.925 0.009 250)"
  accent: "oklch(0.9 0.012 250)"
  rule: "oklch(0.17 0.012 262 / 0.2)"
  live: "oklch(0.58 0.22 27)"
  destructive: "oklch(0.5 0.21 27)"
  you: "oklch(0.5 0.21 262)"
  you-ink: "oklch(0.99 0 0)"
typography:
  masthead:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "clamp(3.6rem, 19vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 62"
  agora:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "2.25rem (3.75rem from 640px)"
    fontWeight: 800
    lineHeight: 0.92
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "3rem (3.75rem from 640px) for the program title, 1.875rem for section titles"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 62"
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "0.025em"
rounded:
  none: "0px"
  mark: "2px"
  sm: "calc(0.25rem * 0.6)"
  base: "0.25rem"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  touch: "44px"
  row: "56px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.muted}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "4px 12px"
    height: "44px"
  badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "28px"
  program-box:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px"
  grade-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
    height: "56px"
  grade-row-you:
    backgroundColor: "{colors.you}"
    textColor: "{colors.you-ink}"
---

# Design System: Disco da Vez

## Overview

**Creative North Star: "The Programming Grid"**

The group's night is one printed page of TV listings. Every person is a row, every step is a time slot, and the drawn album is the prime-time program. The surface is cool newsprint with a light paper grain, set in near-black ink, divided by 1.5px rules. Nothing is lit, glassy or glowing; the page is read, not watched.

The mood is flat, printed, structural and quick to scan. Colour is rationed to meaning: one blue marks you (your row, your chip, your slot in the band), a red dot means "live, do this now", and everyone and everything else is ink on paper. State is read from shape, not hue, so the page works in a glance and in greyscale. Sound completes the print metaphor: pen clicks, teleprinter ticks, a stamp thud and a short programme-opening chime, all synthesized with Web Audio. Sound is off by default; the masthead icon toggle turns it on and the choice is remembered.

The previous valve-radio world was rejected as too decorative; its teal, amber, brass, glass and radio imagery do not return.

**Key Characteristics:**
- Newsprint paper, near-black ink, 1.5px ruled boxes, thick top rule on program boxes.
- One accent, blue, for "you" only, plus the red live dot.
- One typeface, Archivo Variable; width axis does the work of a second family.
- State as shape: filled square, hatched square, dash.
- Flat depth; one soft shadow, on the popover menu only.
- 44px touch targets, phone first, pt-BR.

## Colors

A near-monochrome newsprint palette with one spot-ink blue for you and one red for live.

### Primary
- **Press Ink** (ink): the single working colour. Text, rules, borders, primary buttons, selected tiles, the filled "done" mark, selection highlight, scrollbar.

### Secondary
- **You Blue** (you, with you-ink text): flat cobalt for the signed-in person only: their row in the grid, their chip in the AGORA row, the first slot of the six-slot band. The focus ring reuses its value.
- **Live Red** (live): the on-air dot beside the AGORA line, the roulette needle tip, and the text caret. Never used for fills or text.

### Neutral
- **Cool Newsprint** (paper): page background, with a light fractal-noise grain tiled at 200px.
- **Card Stock** (card): box and input fill. **Popover Stock** (popover): the one floating menu.
- **Mute Wash / Secondary Wash / Accent Wash** (muted, secondary, accent): hover and recessed fills, such as the roulette window and ghost hover.
- **Soft Ink** (ink-soft): secondary text, column heads, years, running times.
- **Hairline Rule** (rule, ink at 20%): row dividers and column separators inside boxes.
- **Paper Ink** (paper-ink): text on ink fills.
- **Correction Red** (destructive): destructive buttons and invalid fields only, darker than live red. The focus ring is a 3px outline with 2px offset in the You Blue value, functional rather than decorative.

### Named Rules
**The One-Accent-Is-You Rule.** The only colour is the blue that means "you", plus the red live dot. Other people are paper and ink; if a colour does not mark you or the one live step, it is ink or paper.

**The State-Is-Shape Rule.** Done, waiting and not-applicable are a filled square, a hatched square and a dash. Never encode state in hue, and keep the legend visible under any grid that uses the marks.

## Typography

**Display Font:** Archivo Variable (system-ui, sans-serif fallback), width axis 62%
**Body Font:** Archivo Variable at 100% width
**Label/Mono Font:** none; tabular numerals (`tabular-nums`) for years, counts and running times

**Character:** A single grotesque used two ways, like a newspaper. Condensed heavy capitals shout the masthead, headings and the AGORA line; normal-width text carries everything else.

### Hierarchy
- **Masthead** (800, wdth 62, uppercase, clamp(3.6rem, 19vw, 6rem), 0.9): the Home title only.
- **AGORA line** (800, wdth 62, uppercase, 2.25rem rising to 3.75rem at 640px, 0.92): the one next step, led by a muted "Agora:" and the live dot.
- **Headline** (800, wdth 62, uppercase, 3rem to 3.75rem, 0.9): the program (album) title. Section titles use 1.875rem. All h1-h3 take this treatment from base CSS.
- **Brand** (800, wdth 62, uppercase, about 26px / 1.65rem): the "Disco da Vez" wordmark next to the logo mark in the masthead strip, beside the long-form date in 14px medium Soft Ink.
- **Body** (400-600, 16px, 1.5): form fields, names (700), buttons (600), copy up to about 26rem measure on Home.
- **Label** (700, 12px, +0.025em, uppercase): grid column heads, badges, "Faixas", roulette caption.

### Named Rules
**The One-Family Rule.** Archivo Variable only. Contrast comes from width (62% vs 100%), weight and case, never from a second family.

## Layout

A single column of ruled bands, capped at max-w-6xl (72rem) with 16px side padding. On phones the order is: masthead strip, group name, AGORA line with the readiness chips, the active step, then the people grid. From 1024px the room splits into a 23rem aside (the grid) and a fluid main column; Home splits into two equal columns from 768px. The spacing rhythm is a 4px grid, mostly 8, 12, 16 and 24px, with 32px between major bands. Interactive targets are at least 44px; grid rows are at least 56px. Major sections open with a 3px ink top rule and 12px of padding; the masthead closes with a 3px bottom rule.

The "Pessoas" section is fully available only before a round starts: the people menu, "Copiar convite", "Meu perfil" and leader claim all live there. During choosing and voting it is a read-only grid with no menu column. On the draw screen (drawing) it is not rendered at all, and the content column spans the full width on desktop.

The people grid is a table of ruled rows: the name sits in a card-stock cell (your own row is filled You Blue), then fixed 72px columns (Escolhas, Voto) hold marks, then a 44px menu cell (only before a round starts). Tracks in the album card use a 2rem number, a flexible title and right-aligned running times, like an inlay card.

## Elevation & Depth

Flat. Depth comes only from 1.5px ink borders, hairline dividers, a 6px top rule on program boxes, and tonal steps between paper, card and wash. The single shadow is a soft popover shadow under the member menu. Nothing lifts on hover; hover changes fill.

### Shadow Vocabulary
- **Popover** (`box-shadow: 0 10px 20px -8px rgb(0 0 0 / 0.35)`): the member options menu only.

### Named Rules
**The Flat-On-Paper Rule.** Surfaces never float. If something needs separating, add a rule; the popover is the only exception.

## Shapes

Crisp and ruled. Controls, boxes, badges and chips use a 4px corner (badges 60% of that). Program boxes (album card, create-group card) have 0 radius with a 6px ink top rule, like a boxed listing. State marks are 20px squares with a 2px border and 2px corners. The only circle is the live dot. Borders are 1.5px ink on boxes and controls, 2px on marks, 1px at 20% for inner dividers. A halftone dot band (5px radial dots, multiplied) overprints the six-slot strip on Home (one blue slot, five ink slots, 6px gaps), evoking print registration.

## Components

### Buttons
- **Shape:** 4px corners, 1.5px ink border, height 44px (48px large, 32px extra-small only for dense cases), 16px side padding, semibold 14px.
- **Primary:** Press Ink fill, Paper Ink text.
- **Outline:** Card Stock fill; **Secondary:** secondary wash; **Ghost:** transparent border; **Destructive:** correction-red border and text on card; **Link:** underlined.
- **Hover / Focus:** fill shifts (primary to 85% ink, outline to muted) over 150ms; focus is a 3px cobalt outline with 2px offset. Disabled drops to 45% opacity.

### The Grade (people grid)
- One row per person: card-stock name cell (the signed-in person's row is solid You Blue with light ink), crown icon for the leader, a "(você)" tag, optional Last.fm line.
- Columns of 72px with the shape marks; a header row in Soft Ink uppercase 12px; a legend row under the box. Marks are announced with aria-labels.
- Motion: a "done" mark stamps in (scale 1.7 to 1, 0.22s). Rows fade in and out with layout animation.

### Mark
- Filled ink square = done; 45-degree hatched square = waiting; short 2px dash at 40% = not applicable; hollow = empty (the unpicked vote tile). Corner chips on person initials use the same marks on a card-coloured square.

### AGORA line and Chips
- The live dot pulses outward (tally, 2s ease-out, loops) beside the 62% caps line. Beneath it, 36px square chips carry each person's initial with a mark at the corner; your chip is blue, the others are card stock with a 1.5px ink border.

### Program Box
- Card Stock fill, 1.5px ink border, 0 radius, 6px top rule, 16 to 20px padding. Holds the album (cover, title, artist, a meta line, outline badges, listen buttons, a ruled tracklist `details`) and the Create group form.

### Inputs / Fields
- 44px, Card Stock, 1.5px ink border, 4px corners, 16px text (14px from md). Focus fills with paper plus the cobalt outline; invalid switches the border to correction red. The caret is live red. The search `Command` list shares the same border, and its selected item inverts to ink fill.

### Badges and chosen items
- 28px, 12px bold uppercase, 4px-ish corners; default is ink fill, outline uses 40% ink border. Picked artists and genres are ink-filled 44px pills with a 44px remove target.

### Vote tiles
- Two columns (three from 640px) of boxes with cover, title, artist and a mark. The picked tile inverts to full ink with a filled mark. Unpicked tiles carry the empty outlined square. Tiles enter with a 60ms stagger, 0.35s.

### Roulette
- A tape of covers (132px wide, 10px gap) slides under a fixed 2px ink needle with a red triangle tip, over a recessed muted window with a ruler strip along the top. It runs 7 seconds on a hard-decelerating curve, then the winner scales to 1.05 with a 3px ink ring while the rest dim to 35% and greyscale. Caption flips from "Sorteando..." to "Album da noite". Under reduced motion it jumps to the result.

### Logo and Masthead
- **Mark:** a 32px ink square with a 6px-of-64 corner (the favicon uses 8), a paper disc inside, a groove ring and centre hole in ink, and a small Live Red dot at the top-right corner outlined in paper. The disc and outline follow the page paper; the favicon repeats the mark with literal colours (#15171c ink, #f2f3f6 paper, #dc2a2b red).
- **Lockup:** mark, 10px gap, then the wordmark in condensed 62% caps. The masthead strip is lockup, then the long-form date, then the sound icon on the right, closed by a 3px ink rule. No invite button lives there.
- **Rules:** the red dot is the same Live Red as the AGORA dot and never changes; the mark never takes You Blue or any other colour; no gradients, glow or extra detail are added to the disc.

### Sound
- Web Audio only, no files, master gain 0.6 through a limiter. Pen-click on every button or option, per-cover teleprinter tick with a looping noise tape during the spin, a stamp thud on a vote or a ready mark, a two-note join chime, a low buzz on error, and a stamp plus a short bell-like chord when the tape locks on the winner. The Som toggle sits in the masthead as an icon only: a 44px square, 1.5px ink border, card fill, Volume2 or VolumeX, fixed aria-label "Som" with aria-pressed carrying the state. It starts off and remembers a change once made.

### History
- Covers in a 3 to 6 column grid, each under a 3px ink rule, with title and artist truncated.

## Do's and Don'ts

### Do:
- **Do** keep the page paper, ink and rules, and let the blue "you" be the only colour field.
- **Do** show state with the filled, hatched and dash marks, and keep the legend under the grid.
- **Do** set h1-h3 and the AGORA line in Archivo at wdth 62, weight 800, uppercase, line-height about 0.9; set everything else at normal width.
- **Do** use 1.5px ink borders, 4px corners, and 0 radius with a 6px top rule for program boxes.
- **Do** keep touch targets at 44px or more and rows at 56px.
- **Do** put light ink (you-ink) on You Blue fills.
- **Do** keep the live red to the dot, the needle tip and the caret, and reserve motion for stamps, band entrances, the pulse and the roulette.

### Don't:
- **Don't** reintroduce the radio world: no teal, amber, brass, glass, blur, dials or valve imagery.
- **Don't** add decoration with no job (the No-Decoration-Without-a-Job Rule): grain is paper, halftone is the print band, rules separate; nothing else ornamental.
- **Don't** give other people their own colours: per-person channel colours were tried and rejected.
- **Don't** use neon, glow, gradients as surfaces, or dark-mode music-app styling.
- **Don't** encode state or status in hue, or colour anything that is not you or the live step.
- **Don't** add a second typeface or fake a display face with fills or shadows.
- **Don't** lift surfaces with shadows; the popover shadow is the only one.
- **Don't** put a decorative eyebrow or kicker above headings; the "Agora:" lead belongs to the one-step line, not to section titles.
