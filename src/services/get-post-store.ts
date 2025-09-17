import { Tweet } from "@the-convocation/twitter-scraper";
import { DBType, Schema } from "db";
import { and, eq } from "drizzle-orm";
const TweetMap = Schema.TweetMap;

export async function getPostStore({ db, tweet, platformId }: {
    db: DBType, tweet?: string | Tweet, platformId: string
}) {
    // Tweet can be either tweet object or tweet.id
    if (!tweet) {
        return;
    }
    let tid = (typeof tweet === "string") ? tweet : tweet.id;
    if (!tid) {
        return;
    }
    const store = db.select().from(TweetMap).where(
        and(
            eq(TweetMap.tweetId, tid),
            eq(TweetMap.platform, platformId)
        )
    ).get()
    return store;
}