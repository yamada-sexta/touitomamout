import { AppBskyFeedPost } from "@atproto/api";
import { Tweet } from "@the-convocation/twitter-scraper";
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
export type BlueskyPostReference = {
  uri: string;
  cid: string;
  value: AppBskyFeedPost.Record;
};

export type BlueskyPost = {
  tweet: Tweet;
  chunks: string[];
  username: string;
  quotePost?: BlueskyPostReference;
  replyPost?: BlueskyPostReference;
};
