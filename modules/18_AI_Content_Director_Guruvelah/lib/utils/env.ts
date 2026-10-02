export interface EnvStatus {
  supabase: boolean;
  ai: boolean;
  serviceRole: boolean;
  cron: boolean;
}

export function getEnvStatus(): EnvStatus {
  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    ai: Boolean(process.env.GEMINI_API_KEY),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cron: Boolean(process.env.CRON_SECRET),
  };
}

export function isConfigured(): boolean {
  const status = getEnvStatus();
  return status.supabase && status.ai;
}

export function getMissingEnvGroups(): string[] {
  const status = getEnvStatus();
  const missing: string[] = [];
  if (!status.supabase) missing.push('Supabase Database & Auth (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  if (!status.ai) missing.push('Google Gemini AI Engine (GEMINI_API_KEY)');
  if (!status.serviceRole) missing.push('Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY)');
  if (!status.cron) missing.push('Cron Secret for Trend Refresh (CRON_SECRET)');
  return missing;
}
