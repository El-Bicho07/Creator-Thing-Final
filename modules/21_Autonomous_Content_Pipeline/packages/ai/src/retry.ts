
export async function withRetry<T>(
  fn: () => Promise<T>,
  isRetryable: (err: any) => boolean = (err) => true
): Promise<T> {
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      if (!isRetryable(error) || attempts >= maxAttempts) {
        throw error;
      }
      const backoff = Math.pow(2, attempts) * 1000 + Math.random() * 500;
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw new Error("Unreachable");
}
