import { DEBUG } from "env";
import z from "zod";

const MisskeyRateLimitErrorSchema = z.object({
  code: z.literal("RATE_LIMIT_EXCEEDED"),
  message: z.string(),
  info: z.object({
    resetMs: z.number(),
  }),
});

export async function withRateLimitRetry<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  ...args: TArgs
): Promise<TResult> {
  while (true) {
    try {
      return await fn(...args);
    } catch (err) {
      const parsed = MisskeyRateLimitErrorSchema.safeParse(err);

      if (!parsed.success) {
        throw err; // not a rate limit error
      }

      const { resetMs } = parsed.data.info;
      const waitTime = resetMs - Date.now();

      if (waitTime > 0) {
        if (DEBUG) {
          console.log(
            `[Misskey] Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      // then loop again and retry
    }
  }
}



export async function handleRateLimit(err: unknown): Promise<boolean> {
  const parsed = MisskeyRateLimitErrorSchema.safeParse(err);

  if (!parsed.success) {
    return false; // not a rate limit error
  }

  const { resetMs } = parsed.data.info;
  const waitTime = resetMs - Date.now();

  if (waitTime > 0) {
    if (DEBUG) {
      console.log(
        `[Misskey] Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  return true;
}
