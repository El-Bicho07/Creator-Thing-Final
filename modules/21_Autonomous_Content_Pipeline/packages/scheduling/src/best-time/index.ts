
export function getBestTime(creatorHistory: any[], planResearch: any) {
  if (creatorHistory && creatorHistory.length > 5) {
    return { time: new Date(), tier: 1 };
  }
  return { time: new Date(), tier: 2 };
}
