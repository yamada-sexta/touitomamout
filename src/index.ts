// Register event
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT (Ctrl+C). Exiting...');
  process.exit(0);
});

import { ProfileSynchronizer } from "services/profile/profile-synchronizer";
import { configuration } from "./configuration/configuration";
import {
  DAEMON,
  SYNC_FREQUENCY_MIN,
  TOUITOMAMOUT_VERSION,
  TWITTER_HANDLE,
} from "./env";
import { MastodonProfileSynchronizer } from "services/profile/mastodon";
import { BlueskyProfileSynchronizer } from "services/profile/bluesky";
import { syncProfile } from "services/profile/sync";
import { syncPosts } from "services/posts/sync";
import { PostSynchronizer } from "services/posts/post-sender";
import { MastodonPostSynchronizer } from "services/posts/mastodon-sender";
import { BlueskyPostSynchronizer } from "services/posts/bluesky";

const {
  twitterClient,
  mastodonClient,
  synchronizedPostsCountAllTime,
  synchronizedPostsCountThisRun,
  blueskyClient,
} = await configuration();


if (!twitterClient) {
  throw new Error("Can't connect to Twitter 𝕏");
}

const profileSynchronizers: ProfileSynchronizer[] = []
const postSynchronizers: PostSynchronizer[]=[]
const emojis: string[] = []

if (mastodonClient) {
  profileSynchronizers.push(
    new MastodonProfileSynchronizer(mastodonClient)
  )
  postSynchronizers.push(
    new MastodonPostSynchronizer(mastodonClient)
  )
  emojis.push("🦣")
} else {
  console.log("🦣 Mastodon will not be synced...")
}

if (blueskyClient) {
  profileSynchronizers.push(
    new BlueskyProfileSynchronizer(blueskyClient)
  )
  postSynchronizers.push(
    new BlueskyPostSynchronizer(blueskyClient)
  )
  emojis.push("☁️")
} else {
  console.log("☁️ Bluesky will not be synced...")
}

/**
 * Main syncing loop
 */
const syncAll = async () => {
  await syncProfile(
    { twitterClient, synchronizers: profileSynchronizers }
  )
  /* Posts sync */
  const postsSyncResponse = await syncPosts({
    twitterClient, syncCount: synchronizedPostsCountThisRun, synchronizers: postSynchronizers
  })

  synchronizedPostsCountAllTime.set(postsSyncResponse.metrics.totalSynced);

  console.log(`\n𝕏 -> ${emojis.join("+")}`);
  console.log(`Touitomamout sync | v${TOUITOMAMOUT_VERSION}`);
  console.log(`| Twitter handle: @${TWITTER_HANDLE}`);
  console.log(
    `| ${postsSyncResponse.metrics.justSynced
      .toString()
      .padStart(5, "0")} just synced posts`,
  );
  console.log(
    `| ${postsSyncResponse.metrics.totalSynced
      .toString()
      .padStart(5, "0")} synced posts so far`,
  );
};

await syncAll();

if (DAEMON) {
  console.log(`Run daemon every ${SYNC_FREQUENCY_MIN}min`);
  setInterval(
    async () => {
      await syncAll();
    },
    SYNC_FREQUENCY_MIN * 60 * 1000,
  );
}


