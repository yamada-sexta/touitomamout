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
  tweetId: integer("tweet_id").notNull(),
  platform: text("platform").notNull(),
  platformStore: text("platform_store").notNull(),
});

export const TwitterCookieCache = sqliteTable("cookies", {
  userHandle: text("user_handle").notNull(),
  cookie: text("cookie").notNull(),
});

export const TwitterProfileCache = sqliteTable("profiles", {
  userId: text("user_id").notNull(),
  avatarHash: text("avatar_hash").notNull(),
  bannerHash: text("banner_hash").notNull()
})