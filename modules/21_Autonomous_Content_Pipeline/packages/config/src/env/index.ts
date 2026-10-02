import { getCoreEnv } from './core.js';
import { getAiEnv } from './ai.js';
import { getAuthEnv } from './auth.js';
import { getSocialEnv } from './social.js';

export const config = {
  get core() { return getCoreEnv(); },
  get ai() { return getAiEnv(); },
  get auth() { return getAuthEnv(); },
  get social() { return getSocialEnv(); },
};
