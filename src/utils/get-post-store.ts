import { Tweet } from "@the-convocation/twitter-scraper";
import { DBType, Schema } from "db";
import { and, eq } from "drizzle-orm";
import z from "zod";

const TweetMap = Schema.TweetMap;

export async function getPostStoreStr({
  db,
  tweet,
  platformId,
}: {
  db: DBType;
  tweet?: string | Tweet;
  platformId: string;
}) {
  // Tweet can be either tweet object or tweet.id
  if (!tweet) {
    return;
  }
  const tid = typeof tweet === "string" ? tweet : tweet.id;
  if (!tid) {
    return;
  }
  const store = db
    .select()
    .from(TweetMap)
    .where(and(eq(TweetMap.tweetId, tid), eq(TweetMap.platform, platformId)))
    .get();
  return store;
}

export async function getPostStore<S extends z.ZodObject = z.ZodObject>(args: {
  s: S;
  db: DBType;
  tweet?: Tweet | string;
  platformId: string;
}) {
  const str = await getPostStoreStr({ ...args });
  const p = args.s.safeParse(str);
  // if (p.success) {
  //   return p.data;
  // } else {
  //   return undefined;
  // }
  return p;
}
