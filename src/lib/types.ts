export type Mode = 'artist' | 'genre'
export type Kind = 'draw' | 'vote'
export type RoundStatus = 'choosing' | 'drawing' | 'voting' | 'done'

/** Álbum = release-group do MusicBrainz (já agrupa remasters/edições). */
export interface Album {
  id: string
  title: string
  artist: string
  year?: string
}

/** Escolha de um membro: artista (id = mbid) ou gênero (id = nome do gênero). */
export interface Choice {
  id: string
  name: string
  sub?: string
}

export interface Group {
  id: string
  name: string
  leader_id: string
  last_mode: Mode
  last_kind: Kind
}

export interface Member {
  id: string
  group_id: string
  user_id: string
  name: string
  lastfm_user: string | null
  last_choices: Partial<Record<Mode, Choice[]>>
  last_seen: string
  joined_at: string
}

export interface DrawResult {
  album: Album
  /** Álbuns do pool só para encher a roleta. */
  filler?: Album[]
  /** Votação: álbuns empatados e contagem de votos. */
  tied?: Album[]
  tally?: Record<string, number>
}

export interface Round {
  id: string
  group_id: string
  mode: Mode
  kind: Kind
  status: RoundStatus
  participants: string[]
  candidates: Album[] | null
  result: DrawResult | null
  spin: number
  result_at: string | null
}

export interface RoundChoice {
  round_id: string
  member_id: string
  items: Choice[]
  ready: boolean
  voted: boolean
}

export interface Vote {
  round_id: string
  member_id: string
  album_id: string
}

export interface HistoryItem {
  id: string
  album_id: string
  album: Album
  confirmed_at: string
}

export interface AlbumDetails {
  tracks: { n: number; title: string; ms: number | null }[]
  totalMs: number
  label?: string
  tags: string[]
  links: { spotify?: string; ytmusic?: string }
}
