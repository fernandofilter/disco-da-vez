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
  - Trigger the draw or open the vote once everyone has confirmed; on the draw, accept the album, draw again or send everyone back to choosing; on the vote, close it early or send everyone back to choosing (after a confirmation, since the ballots already cast are discarded). Going back to choosing keeps everyone's picks and confirmations and rebuilds the participants from whoever is in the group now, so people who joined mid-round get in; the leader sees a notice naming who is waiting.
  - Remove a person or pass leadership to someone (per-person menu in the people list). The leader cannot leave; pass leadership first.
  - Delete an album from the group history, freeing it to be drawn again.
  - Delete the group, with all rounds and history, for everyone: on the group page or from the "Seus grupos" list on the home screen (only rows where you lead show the delete button).
- Joining mid-round: anyone who joins while the round is still in choosing becomes a participant right away; anyone who joins during the draw or the vote watches as a spectator until the leader goes back to choosing (or the next round).
- Group management (people menu, invite link and code, delete group) is available before a round starts and during choosing; on the draw and vote screens the people section is hidden. Members who are not the leader can leave the group from their own row in the people list (back to the home screen) or from the "Seus grupos" list (exit button on rows they do not lead); they can rejoin through the invite link. A leader gone 7+ days can be claimed by another member.
- Phone notifications (Web Push): each person can turn on the bell in a group to be told about every step of the round (round opened, everyone chose (leader only), roulette stopped with the album, vote opened, vote closed with the winner, album confirmed), even with the browser closed. Per device and per group; whoever triggered the step is not notified. On iPhone it only works from the Home Screen app (iOS 16.4+), which has its own storage, so the person joins the group again there. When everyone has voted, any participant's open screen closes the vote, so it never waits on an absent leader.
- Real-time group state via Supabase; albums and covers from MusicBrainz and Cover Art Archive; Last.fm is optional (an extra source of albums by genre).
- Static SPA (Vite, React, Tailwind, shadcn), deployed on Vercel; `/demo` exists in dev only.
- Interface copy is in Brazilian Portuguese (observed in the existing code).
- Mobile-first usage with touch; desktop is secondary.

## Listen links (fixed rule, do not change)
The "Ouvir no Spotify" and "YouTube Music" buttons (album card and history) follow one rule, locked by `src/lib/listen.test.ts`:
1. When the album is found in the app, the button opens the album's own page directly (`open.spotify.com/album/…`, `music.youtube.com/playlist?list=…` or `music.youtube.com/browse/MPREb…`). Sources, in order: the MusicBrainz link of the release, then Odesli (song.link) from the iTunes match.
2. When it is not found, the button opens the app's search with the album title and the artist name: `https://open.spotify.com/search/<title artist>` and `https://music.youtube.com/search?q=<title artist>`. Never a fixed term, and nothing after the term in the Spotify path: the old `…/search/<term>/albums` made the Spotify app search for "albums" for every record.
If a change breaks one of those tests, the change is wrong, not the test.

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
