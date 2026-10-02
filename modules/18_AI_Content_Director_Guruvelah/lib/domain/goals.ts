export const GOAL_DIRECTIVES: Record<string, string> = {
  'Increase Reach':
    'Prioritize high curiosity, broad relevance, the strongest possible hook, fast pacing, and maximum shareability.',
  'Build Authority':
    'Prioritize deep expertise, evidence-style specific insights (never invented facts), credible framing, and strong industry positioning.',
  Educate:
    'Prioritize one clear concept, step-by-step clarity, concrete real-world examples, retention, and a practical recap.',
  'Generate Engagement':
    'Prioritize direct questions, open debate, polarising-but-fair takes, and specific comment triggers.',
  'Build Personal Brand':
    'Prioritize personal stories, core values, opinions, behind-the-scenes authenticity, and recurring signature phrasing.',
  'Promote Product':
    'Prioritize a clear problem-to-solution narrative, single key benefit, honest claims, and a soft-sell approach (never invent fake testimonials or numbers).',
  'Generate Leads':
    'Prioritize a sharp pain point, specific offer or lead magnet, concrete CTA (e.g. comment keyword or link in bio), and qualifying language.',
  'Drive Followers':
    'Prioritize series framing, consistent value promise, "follow for part 2" open loops, and clear niche identity.',
};

export function getGoalDirective(goal: string): string {
  return GOAL_DIRECTIVES[goal] || GOAL_DIRECTIVES['Increase Reach'];
}
