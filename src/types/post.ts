import { AppBskyFeedPost } from "@atproto/api";
import { Tweet } from "@the-convocation/twitter-scraper";

export type MastodonPost = {
  tweet: Tweet;
  chunks: string[];
  username: string;
  inReplyToId: string | undefined;
};

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

export type Post = {
  mastodon: null | MastodonPost;
  bluesky: null | BlueskyPost;
};

export interface ValidPost extends Tweet {
  id: string;
}

export function isValidPost(tweet: Tweet): tweet is ValidPost {
  return "id" in tweet;
}
