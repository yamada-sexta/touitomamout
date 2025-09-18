import z from "zod";

export const BLUESKY_KEYS = [
  "BLUESKY_INSTANCE",
  "BLUESKY_IDENTIFIER",
  "BLUESKY_PASSWORD",
] as const;

export const BlueskyPlatformStore = z.object({
  cid: z.string(),
  rkey: z.string(),
});

// const PostRefSchema =
