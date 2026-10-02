export const LIFECYCLE_DIRECTIVES: Record<string, string> = {
  emerging:
    'Recommend fast reactions, first-mover perspectives, foundational explainers, and prediction questions.',
  rising:
    'Recommend practical how-to guides, "how to use it now" frameworks, comparison breakdowns, and early lessons.',
  peak:
    'Recommend contrarian angles, unique perspectives, deep-dive explanations, and myth vs. fact breakdowns.',
  declining:
    'Recommend lessons learned, retrospectives, case studies, and long-tail educational takeaways.',
  evergreen:
    'Recommend foundational explainers, reference checklists, and "complete guide" style framing.',
  unknown:
    'No lifecycle-based steering; focus entirely on creator identity and trend topic.',
};

export function getLifecycleDirective(stage?: string | null): string {
  if (!stage) return LIFECYCLE_DIRECTIVES['unknown'];
  return LIFECYCLE_DIRECTIVES[stage.toLowerCase()] || LIFECYCLE_DIRECTIVES['unknown'];
}
