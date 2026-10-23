# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Groups of 2–6 friends who want a recurring ritual of listening to the same album and talking about it afterwards. They use it day to day, mostly from their phones, each person in their own place. One member is the group "leader" and drives each round; the others join through an invite link.

## Product Purpose
Disco da Vez removes the "what do we listen to?" negotiation. Each person drops up to 5 artists or genres, and the group either spins a roulette or votes in secret on candidate albums. The result is one full album everyone listens to, discusses and discovers together. Success is the group actually finishing a round and listening, repeatedly.

## Positioning
The decision itself is the event: a shared roulette or a secret vote, not a playlist one person curates. It targets whole albums (MusicBrainz release-groups, remasters collapsed), not loose tracks. No sign-up: anonymous sign-in plus an invite link. The group has a memory: albums already heard ("Já ouvimos") never return.

## Capabilities and Constraints
- Rounds: leader picks mode (artists or genres) and kind (draw or vote); everyone picks 1–5 items and confirms; leader triggers the draw or vote (vote shows 6 candidates, ties are broken server-side, ballots are secret until everyone has voted).
- Leader powers (enforced server-side; everyone else gets "forbidden"):
  - Start a round, choosing the kind (draw or vote) and the mode (artists, genres or albums).
  - Trigger the draw or open the vote once everyone has confirmed; on the draw, accept the album, draw again or send everyone back to choosing; on the vote, close it early.
  - Remove a person or pass leadership to someone (per-person menu in the people list). The leader cannot leave; pass leadership first.
  - Delete an album from the group history, freeing it to be drawn again.
  - Delete the group, with all rounds and history, for everyone: on the group page or from the "Seus grupos" list on the home screen (only rows where you lead show the delete button).
- Group management (people menu, invite link and code, delete group) is available before a round starts and during choosing; on the draw and vote screens the people section is hidden. Members who are not the leader can leave the group from the same menu, and a leader gone 7+ days can be claimed by another member.
- Real-time group state via Supabase; albums and covers from MusicBrainz and Cover Art Archive; Last.fm is optional (an extra source of albums by genre).
- Static SPA (Vite, React, Tailwind, shadcn), deployed on Vercel; `/demo` exists in dev only.
- Interface copy is in Brazilian Portuguese (observed in the existing code).
- Mobile-first usage with touch; desktop is secondary.

## Brand Commitments
Name is "Disco da Vez" (renamed from "Album Sort" at the user's request; pt-BR idiom for "the record of the moment"). Logo mark: an ink square holding a paper disc with a red "live" dot, with the wordmark in condensed caps; favicon is the same mark. No other brand constraints were stated.

## Evidence on Hand
Working product code in `src/`, Supabase schema in `supabase/migrations/0001_init.sql`, and the logo mark and favicon (`public/favicon.svg`). No testimonials, user numbers or screenshots exist; do not invent them.

## Product Principles
1. The decision is a shared moment: make the roulette and the vote feel like an event the whole group is in together.
2. Zero friction to start: a link and a name, no accounts, no explanations before the first round.
3. The album is the point: cover, tracklist and context come first; interface chrome recedes.
4. Everyone is a first-class participant on a phone, in real time, regardless of who leads.
5. The group's history is respected: never repeat, never silently drop a choice.
