import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
/**
 * Stores the current database schema version.
 * Should only ever contain one row: { id: 1, version: X }
 */
export const Version = sqliteTable("version", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
});

export const TweetMap = sqliteTable("tweet_map", {
  tweetId: integer("tweet_id"),
  platform: text("platform"),
  platformStore: text("platform_store"),
});

export const TwitterCookieCache = sqliteTable("cookies", {
  userHandle: text("user_handle"),
  cookie: text("cookie"),
});

