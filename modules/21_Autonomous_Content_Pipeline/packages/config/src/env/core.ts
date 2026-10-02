import { z } from 'zod';

export const coreEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url(),
  MONGODB_URI: z.string().url(),
});

export const getCoreEnv = () => {
  const parsed = coreEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const error = parsed.error.issues.map(i => i.path.join('.')).join(', ');
    console.error(`Missing or invalid core env variables: ${error}`);
    process.exit(1);
  }
  return parsed.data;
};
