import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const TweetMap = sqliteTable("tweet_map", {
  tweetId: integer("tweet_id"),
  platform: text("platform"),
  platformStore: text("platform_store"),
});

export const TwitterCookieCache = sqliteTable("cookies", {
  userHandle: text("user_handle"),
  cookie: text("cookie"),
});

