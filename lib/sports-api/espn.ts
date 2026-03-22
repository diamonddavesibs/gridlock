export interface GameScore {
  externalGameId: string
  homeScore: number
  awayScore: number
  isCompleted: boolean
  period: string
}

// Maps pool sport strings to ESPN API paths
const ESPN_SPORT_PATHS: Record<string, string> = {
  nfl: 'football/nfl',
  'ncaa football': 'football/college-football',
  'ncaa basketball': 'basketball/mens-college-basketball',
  nba: 'basketball/nba',
}

function espnPathForSport(sport: string): string {
  return ESPN_SPORT_PATHS[sport.toLowerCase()] ?? 'football/nfl'
}

export async function fetchEspnScore(gameId: string, sport = 'NFL'): Promise<GameScore | null> {
  try {
    const path = espnPathForSport(sport)
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`,
      { next: { revalidate: 0 } }
    )
    const data = await res.json()

    const event = data.events?.find((e: any) => e.id === gameId)
    if (!event) return null

    const competition = event.competitions?.[0]
    const competitors = competition?.competitors ?? []
    const home = competitors.find((c: any) => c.homeAway === 'home')
    const away = competitors.find((c: any) => c.homeAway === 'away')

    return {
      externalGameId: gameId,
      homeScore: parseInt(home?.score ?? '0'),
      awayScore: parseInt(away?.score ?? '0'),
      isCompleted: competition?.status?.type?.completed ?? false,
      period: competition?.status?.type?.shortDetail ?? 'In Progress',
    }
  } catch {
    return null
  }
}
