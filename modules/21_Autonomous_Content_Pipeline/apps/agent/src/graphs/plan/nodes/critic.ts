
export function planCritic(state: any) {
  // Enforce citations
  if (state.plan && state.plan.claims) {
    for (const claim of state.plan.claims) {
      if (!claim.citationIds || claim.citationIds.length === 0) {
        throw new Error("Citation missing for claim");
      }
    }
  }
  return state;
}
