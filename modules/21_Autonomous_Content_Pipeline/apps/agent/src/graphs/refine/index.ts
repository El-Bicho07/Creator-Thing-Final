
export function runRefineGraph(events: any[]) {
  if (events.length < 5) return { status: 'exit_early' };
  return { status: 'synthesized' };
}
