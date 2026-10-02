export type GoalOption =
  | 'Get more subscribers'
  | 'Get more comments'
  | 'Promote something'
  | 'Teach something'
  | 'Build trust';

export type TimeOption = '15 min' | '45 min' | 'A full shoot';

export type ToneOption = 'Conversational' | 'Professional' | 'Funny';

export type PlatformOption = 'YouTube' | 'Instagram' | 'TikTok' | 'LinkedIn' | 'X';

export interface PlanForm {
  niche: string;
  goal: GoalOption;
  time: TimeOption;
  tone: ToneOption;
  platform: PlatformOption;
}

export type SlotType = 'main' | 'quick' | 'trust';

export interface ThumbnailIdea {
  idea: string;
  textOnImage: string;
}

export interface PlanItem {
  id: string;
  slot: SlotType;
  slotName: string; // e.g. "Main post", "Quick engage", "Trust builder"
  title: string;
  altTitle: string;
  format: 'Community post' | 'Short' | 'Video';
  platform: PlatformOption;
  hook: string;
  cta: string;
  thumb?: ThumbnailIdea;
  outline: string[];
  caption: string;
  note: string;
  best: string;
  done: boolean;
}

export interface Plan {
  id: string;
  date: string; // YYYY-MM-DD or readable string
  createdAt: number;
  form: PlanForm;
  items: PlanItem[];
  salt: number;
}

export interface PlanEngine {
  generatePlan(form: PlanForm, salt?: number): Plan;
  makeItem(form: PlanForm, slot: SlotType, seed: number): PlanItem;
  swapIdea(form: PlanForm, currentItem: PlanItem): PlanItem;
  newHook(niche: string, tone: ToneOption, currentHook: string): string;
}

export interface PlanRepository {
  getPlans(): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | null>;
  savePlan(plan: Plan): Promise<void>;
  deletePlan(id: string): Promise<void>;
  hasSeenIntro(): Promise<boolean>;
  setSeenIntro(seen: boolean): Promise<void>;
}
