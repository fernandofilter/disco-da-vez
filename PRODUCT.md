# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Groups of 2–6 friends who want a recurring ritual of listening to the same album and talking about it afterwards. They use it day to day, mostly from their phones, each person in their own place. One member is the group "leader" and drives each round; the others join through an invite link.

## Product Purpose
Disco da Vez removes the "what do we listen to?" negotiation. Each person drops up to 5 artists or genres, and the group either spins a roulette (CS2-case style) or votes in secret on candidate albums. The result is one full album everyone listens to, discusses and discovers together. Success is the group actually finishing a round and listening, repeatedly.

## Positioning
The decision itself is the event: a shared roulette or a secret vote, not a playlist one person curates. It targets whole albums (MusicBrainz release-groups, remasters collapsed), not loose tracks. No sign-up: anonymous sign-in plus an invite link. The group has a memory: albums already heard ("Já ouvimos") never return, and an optional Last.fm username filters what each person has already listened to.

## Capabilities and Constraints
- Rounds: leader picks mode (artists or genres) and kind (draw or vote); everyone picks 1–5 items and confirms; leader triggers the draw or vote (vote shows 6 candidates, ties are broken server-side, ballots are secret until everyone has voted).
- Leader powers: start rounds, remove people, pass leadership; a leader gone 7+ days can be claimed by another member. Group management (people menu, invite link, profile) exists only before a round starts; during choosing and voting the people grid is read-only state, and it is hidden on the draw screen.
- Real-time group state via Supabase; albums and covers from MusicBrainz and Cover Art Archive; Last.fm is optional (genres and "already heard" filter).
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
