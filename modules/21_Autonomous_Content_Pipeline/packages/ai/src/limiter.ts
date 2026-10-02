
// A token bucket rate limiter
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private rpm: number, 
    private maxCapacity: number
  ) {
    this.tokens = maxCapacity;
    this.lastRefill = Date.now();
  }

  async acquire(tokensRequested: number = 1): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= tokensRequested) {
        this.tokens -= tokensRequested;
        return;
      }
      
      const waitTime = ((tokensRequested - this.tokens) / this.rpm) * 60000;
      if (waitTime > 60000) {
         // Cap max wait to 60 seconds
         throw new Error("Rate limit wait time exceeds sane ceiling");
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private refill() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const tokensToAdd = (elapsedMs / 60000) * this.rpm;
    
    this.tokens = Math.min(this.maxCapacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
