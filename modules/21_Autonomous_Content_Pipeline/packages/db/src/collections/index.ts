
import { getClient } from '../client.js';

export function getDb() {
  return getClient().db();
}

export const collections = {
  get pipelineRuns() { return getDb().collection('pipelineRuns'); },
  get runEvents() { return getDb().collection('runEvents'); },
  get researchCache() { return getDb().collection('researchCache'); },
  get usageLedger() { return getDb().collection('usageLedger'); },
  get socialAccounts() { return getDb().collection('socialAccounts'); },
  get artifacts() { return getDb().collection('artifacts'); },
  get scheduleEntries() { return getDb().collection('scheduleEntries'); },
  get _migrations() { return getDb().collection('_migrations'); },
};
