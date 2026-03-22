export function numbersRevealMessage(teamHome: string, teamAway: string, row: number, col: number): string {
  return `🎲 GridLock: Numbers are in! Your square is ${teamHome} ${row} / ${teamAway} ${col}. Good luck!`
}

export function periodWinnerMessage(period: string, teamHome: string, homeScore: number, teamAway: string, awayScore: number, isWinner: boolean, winnerName: string): string {
  if (isWinner) {
    return `🏆 GridLock — ${period} Result: ${teamHome} ${homeScore} – ${teamAway} ${awayScore}. YOU WIN! Your square matched!`
  }
  return `📊 GridLock — ${period} Result: ${teamHome} ${homeScore} – ${teamAway} ${awayScore}. Winner: ${winnerName}. Better luck next period!`
}
