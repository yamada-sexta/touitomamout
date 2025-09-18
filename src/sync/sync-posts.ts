import { Scraper } from "@the-convocation/twitter-scraper";
import { type DBType, Schema } from "db";
import { eq } from "drizzle-orm";
import {
  DEBUG,
  FORCE_SYNC_POSTS,
  MAX_CONSECUTIVE_CACHED as MAX_NEW_CONSECUTIVE_CACHED,
  type TwitterHandle,
} from "env";
import ora from "ora";
import { isValidPost } from "types/post";
import { oraPrefixer } from "utils/logs";
import { logError } from "utils/logs";
import { getPostStore } from "../utils/get-post-store";
import type { TaggedSynchronizer } from "./synchronizer";

const MAX_TWEET = 200;

const TweetMap = Schema.TweetMap;
const TweetSynced = Schema.TweetSynced;

export async function syncPosts(args: {
  db: DBType;
  handle: TwitterHandle;
  x: Scraper;
  synchronizers: TaggedSynchronizer[];
}) {
  const { db, handle, x, synchronizers } = args;
  if (!synchronizers.filter((s) => s.syncPost).length) {
    return;
  }
  const log = ora({
    color: "cyan",
    prefixText: oraPrefixer("posts"),
  }).start();
  log.text = "starting...";

  let cachedCounter = 0;
  let counter = 0;
  try {
    if (DEBUG) console.log("getting", handle);
    const iter = x.getTweets(handle.handle, MAX_TWEET);
    log.text = "Created async iterator";
    for await (const tweet of iter) {
      counter++;
      log.text = `syncing [${counter}/${MAX_TWEET}]`;
      if (cachedCounter >= MAX_NEW_CONSECUTIVE_CACHED) {
        log.info("skipping because too many consecutive cached tweets");
        break;
      }
      if (!isValidPost(tweet)) {
        log.warn(`tweet is not valid...\n${tweet}`);
        continue;
      }
      const synced = db
        .select()
        .from(TweetSynced)
        .where(eq(TweetSynced.tweetId, tweet.id))
        .get();
      if (synced && synced.synced !== 0 && !FORCE_SYNC_POSTS) {
        log.info("skipping synced tweet");
        cachedCounter++;
        log.info(
          `encounter cached tweet [${cachedCounter}/${MAX_NEW_CONSECUTIVE_CACHED}]`
        );
        continue;
      } else {
        cachedCounter = 0;
      }
      try {
        for (const s of args.synchronizers) {
          // Might have race condition if done in parallel
          if (!s.syncPost) continue;
          const store = await getPostStore({
            db,
            tweet,
            platformId: s.platformId,
            s: s.storeSchema,
          });
          const syncRes = await s.syncPost({ log, tweet, store });
          const storeStr = syncRes ? JSON.stringify(syncRes.store) : "";
          db.insert(TweetMap).values({
            tweetId: tweet.id,
            platform: s.platformId,
            platformStore: storeStr,
          });
        }
        // Mark as synced
        db.insert(TweetSynced)
          .values({ tweetId: tweet.id, synced: 1 })
          .onConflictDoUpdate({
            target: TweetSynced.tweetId,
            set: { synced: 1 },
          })
          .run();
      } catch (e) {
        logError(log, e)`Failed to sync tweet: ${e}`;
        console.error(tweet);
      }
    }
  } catch (e) {
    console.error("Scraper failed with an error:", e);
  }

  log.succeed("synced");
}
