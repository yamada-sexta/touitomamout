let interval: NodeJS.Timeout | null = null;
process.on("exit", code => {
  console.log(`Process exited with code ${code}`);
});
// Register event
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT (Ctrl+C). Exiting...');
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
  // TWITTER_HANDLE,
} from "./env";
import { syncProfile } from "services/profile/sync";
import { syncPosts } from "services/posts/sync";
import { PostSynchronizer } from "services/posts/post-sender";
import { Scraper } from "@the-convocation/twitter-scraper";
import Gauge from "@pm2/io/build/main/utils/metrics/gauge";
import Counter from "@pm2/io/build/main/utils/metrics/counter";

interface MetaClient {
  twitter: Scraper,
  twitterHandle: TwitterHandle,
  profileSynchronizers: ProfileSynchronizer[]
  postSynchronizers: PostSynchronizer[]
  emojis: string[]
  allTimeCount: Gauge
  thisRunCount: Counter
}
const clients: MetaClient[] = []

for await (const handle of TWITTER_HANDLES) {
  const {
    twitterClient,
    // mastodonClient,
    synchronizedPostsCountAllTime,
    synchronizedPostsCountThisRun,
    // blueskyClient,
    profileSynchronizers,
    postSynchronizers,
    emojis
  } = await configuration({ twitterHandle: handle });

  if (!twitterClient) {
    throw new Error("Can't connect to Twitter 𝕏");
  }

  clients.push(
    {
      twitter: twitterClient,
      twitterHandle: handle,
      allTimeCount: synchronizedPostsCountAllTime,
      thisRunCount: synchronizedPostsCountThisRun,
      postSynchronizers, profileSynchronizers, emojis
    }
  )
}


/**
 * Main syncing loop
 */
const syncAll = async () => {
  if (!clients) {
    throw Error("No usable client...")
  }

  for await (const client of clients) {
    await syncProfile(
      { twitterClient: client.twitter, synchronizers: client.profileSynchronizers, twitterHandle: client.twitterHandle }
    )
    /* Posts sync */
    const postsSyncResponse = await syncPosts({
      twitterClient: client.twitter,
      syncCount: client.thisRunCount,
      synchronizers: client.postSynchronizers,
      twitterHandle: client.twitterHandle.handle
    })

    client.allTimeCount.set(postsSyncResponse.metrics.totalSynced);

    console.log(`\n𝕏 -> ${client.emojis.join("+")}`);
    console.log(`Touitomamout sync | v${TOUITOMAMOUT_VERSION}`);
    console.log(`| Twitter handle: @${client.twitterHandle.handle}`);
    console.log(
      `| just synced ${postsSyncResponse.metrics.justSynced} post(s)`,
    );
    console.log(
      `| ${postsSyncResponse.metrics.totalSynced
        .toString()
        .padStart(5, "_")} synced posts so far`,
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
    SYNC_FREQUENCY_MIN * 60 * 1000,
  );
}