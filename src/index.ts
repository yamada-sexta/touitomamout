let interval: NodeJS.Timeout | null = null;
process.on("exit", (code) => {
  console.log(`Process exited with code ${code}`);
});
// Register event
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT (Ctrl+C). Exiting...");
  if (interval) clearInterval(interval); // stop daemon loop
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Exiting...");
  process.exit(0);
});

console.log(`\nTouitomamout@v${TOUITOMAMOUT_VERSION}\n`);
import { ProfileSynchronizer } from "services/profile/profile-synchronizer";
import { configuration } from "./configuration/configuration";
import {
  DAEMON,
  SYNC_FREQUENCY_MIN,
  TOUITOMAMOUT_VERSION,
  TWITTER_HANDLES,
  TwitterHandle,
} from "./env";
import { syncProfile } from "services/profile/sync";
import { syncPosts } from "services/posts/sync";
import { PostSynchronizer } from "services/posts/post-sender";
import { Scraper } from "@the-convocation/twitter-scraper";
import Gauge from "@pm2/io/build/main/utils/metrics/gauge";
import Counter from "@pm2/io/build/main/utils/metrics/counter";
import { BlueskySynchronizerFactory } from "services/bluesky-synchronizer";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { migrate } from "db/migration";

import * as schema from "db/schema";

const factories = [BlueskySynchronizerFactory] as const;

const sqlite = new Database("sqlite.db", {
  create: true,
  safeIntegers: true,
  strict: true,
});
export const db = drizzle<typeof schema>({
  client: sqlite,
});
await migrate(db);

for (const factory of factories) {
}
// .ENV_KEYS;

interface MetaClient {
  twitter: Scraper;
  twitterHandle: TwitterHandle;
  profileSynchronizers: ProfileSynchronizer[];
  postSynchronizers: PostSynchronizer[];
  emojis: string[];
  allTimeCount: Gauge;
  thisRunCount: Counter;
}
const clients: MetaClient[] = [];

for await (const handle of TWITTER_HANDLES) {
  const {
    twitterClient,
    // mastodonClient,
    synchronizedPostsCountAllTime,
    synchronizedPostsCountThisRun,
    // blueskyClient,
    profileSynchronizers,
    postSynchronizers,
    emojis,
  } = await configuration({ twitterHandle: handle });

  if (!twitterClient) {
    throw new Error("Can't connect to Twitter 𝕏");
  }

  clients.push({
    twitter: twitterClient,
    twitterHandle: handle,
    allTimeCount: synchronizedPostsCountAllTime,
    thisRunCount: synchronizedPostsCountThisRun,
    postSynchronizers,
    profileSynchronizers,
    emojis,
  });
}

/**
 * Main syncing loop
 */
const syncAll = async () => {
  if (!clients) {
    throw Error("No usable client...");
  }

  for await (const client of clients) {
    console.log(`\n𝕏 -> ${client.emojis.join("+")}`);
    console.log(`| Twitter handle: @${client.twitterHandle.handle}`);
    await syncProfile({
      twitterClient: client.twitter,
      synchronizers: client.profileSynchronizers,
      twitterHandle: client.twitterHandle,
    });
    /* Posts sync */
    const postsSyncResponse = await syncPosts({
      twitterClient: client.twitter,
      syncCount: client.thisRunCount,
      synchronizers: client.postSynchronizers,
      twitterHandle: client.twitterHandle.handle,
    });

    client.allTimeCount.set(postsSyncResponse.metrics.totalSynced);
    console.log(
      `| just synced ${postsSyncResponse.metrics.justSynced} post(s)`
    );
    console.log(
      `| ${postsSyncResponse.metrics.totalSynced} post(s) synced so far`
    );
  }
};

await syncAll();

if (DAEMON) {
  console.log(`Run daemon every ${SYNC_FREQUENCY_MIN}min`);
  interval = setInterval(
    async () => {
      await syncAll();
    },
    SYNC_FREQUENCY_MIN * 60 * 1000
  );
}
