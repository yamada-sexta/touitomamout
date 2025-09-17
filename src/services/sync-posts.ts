import { Scraper } from "@the-convocation/twitter-scraper";
import { Schema, type DBType } from "db";
import { MAX_CONSECUTIVE_CACHED as MAX_NEW_CONSECUTIVE_CACHED, type TwitterHandle } from "env";
import type { TaggedSynchronizer } from "./synchronizer";
import ora from "ora";
import { oraPrefixer } from "utils/logs";
// import { isValidPost } from "types/post";
// import { and, eq } from "drizzle-orm";
// import { logError } from "utils/logs/log-error";
// import { isRecentTweet } from "utils/tweet";
// import { getPostStore } from "./get-post-store";

const MAX_TWEET = 5;

const TweetMap = Schema.TweetMap;
const TweetSynced = Schema.TweetSynced;


export async function syncPosts(args: {
    db: DBType, handle: TwitterHandle, x: Scraper, synchronizers: TaggedSynchronizer[];
}) {
    const { db, handle, x, synchronizers } = args;
    if (!synchronizers.filter(s => s.syncPost).length) {
        return;
    }

    const log = ora({
        color: "cyan",
        prefixText: oraPrefixer("posts"),
    }).start();
    log.text = "starting...";

    let newCached = 0;
    let counter = 0;
    console.log("Got here");
    try {
        console.log("getting", handle)
        const iter = x.getTweets(handle.handle, MAX_TWEET);
        log.text ="Created async iterator";
        console.log(iter)

for await (const tweet of iter) {
    log.text = "hii"
}
        // for await (const tweet of iter) {
        //     counter++;
        //     log.text = `syncing [${counter}/${MAX_TWEET}]`
        //     if (newCached > MAX_NEW_CONSECUTIVE_CACHED) {
        //         log.info("skipping because too many consecutive cached tweets")
        //         break;
        //     }
        //     if (!isValidPost(tweet)) {
        //         log.warn(`tweet is not valid...\n${tweet}`)
        //         continue;
        //     }
        //     const synced = db.select().from(TweetSynced).where(eq(TweetMap.tweetId, tweet.id)).get();
        //     if (synced && synced.synced !== 0) {
        //         log.info("skipping synced tweet")
        //         if (isRecentTweet(tweet)) {
        //             newCached++;
        //             log.info(`encounter new cached tweet [${newCached}/${MAX_NEW_CONSECUTIVE_CACHED}]`)
        //         }
        //         continue;
        //     } else {
        //         newCached = 0
        //     }
        //     try {
        //         for (const s of args.synchronizers) {
        //             // Might have race condition if done in parallel
        //             if (!s.syncPost) continue;
        //             const store = await getPostStore({
        //                 db, tweet, platformId: s.platformId
        //             });

        //             const platformStore = store?.platformStore;
        //             const syncRes = await s.syncPost({ log, tweet, platformStore })
        //             db.insert(TweetMap).values(
        //                 { tweetId: tweet.id, platform: s.platformId, platformStore: syncRes ? syncRes.platformStore : "" }
        //             )
        //         }

        //         // Mark as synced
        //         db.insert(TweetSynced)
        //             .values({ tweetId: tweet.id, synced: 1 })
        //             .onConflictDoUpdate({
        //                 target: TweetSynced.tweetId,
        //                 set: { synced: 1 },
        //             })
        //             .run();
        //     } catch (e) {
        //         logError(log, e)`Failed to sync tweet: ${e}`
        //     }
        // }
    } catch (e) {
        console.error("Scraper failed with an error:", e);
    }

    log.succeed("synced")
}