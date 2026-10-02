
import { UsageLedgerPort, BudgetExceededError } from '@contentyou/schemas';

export async function checkBudget(
  ledger: UsageLedgerPort, 
  userId: string, 
  limits: { maxTokensPerDay: number; maxQuotaPerDay: number }
) {
  const day = new Date().toISOString().split('T')[0];
  const usage = await ledger.getDailyUsage(userId, day);
  
  if (usage.tokens > limits.maxTokensPerDay) {
    throw new BudgetExceededError("Daily token limit exceeded", { resetAt: new Date(new Date().setUTCHours(24,0,0,0)) });
  }
  if (usage.quotaUnits > limits.maxQuotaPerDay) {
    throw new BudgetExceededError("Daily quota limit exceeded", { resetAt: new Date(new Date().setUTCHours(24,0,0,0)) });
  }
}
