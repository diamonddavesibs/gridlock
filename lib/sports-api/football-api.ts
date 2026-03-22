import type { GameScore } from './espn'

export async function fetchFootballApiScore(gameId: string): Promise<GameScore | null> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${gameId}`,
      {
        headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY ?? '' },
        next: { revalidate: 0 },
      }
    )
    const data = await res.json()
    const fixture = data.response?.[0]
    if (!fixture) return null

    return {
      externalGameId: gameId,
      homeScore: fixture.goals?.home ?? 0,
      awayScore: fixture.goals?.away ?? 0,
      isCompleted: fixture.fixture?.status?.short === 'FT',
      period: fixture.fixture?.status?.long ?? 'In Progress',
    }
  } catch {
    return null
  }
}
