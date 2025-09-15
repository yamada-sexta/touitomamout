import { configuration } from "./configuration/configuration";
import {
  DAEMON,
  SYNC_BLUESKY,
  SYNC_FREQUENCY_MIN,
  SYNC_MASTODON,
  TOUITOMAMOUT_VERSION,
  TWITTER_HANDLE,
} from "./constants";
import {
  postsSynchronizerService,
  profileSynchronizerService,
} from "./services";

const {
  twitterClient,
  mastodonClient,
  synchronizedPostsCountAllTime,
  synchronizedPostsCountThisRun,
  blueskyClient,
} = await configuration();

/**
 * Let the magic happens 💫.
 */
const touitomamout = async () => {
  if (SYNC_MASTODON && !mastodonClient) {
    throw new Error("Can't connect to Mastodon 🦣");
  }
  if (SYNC_BLUESKY && !blueskyClient) {
    throw new Error("Can't connect to Bluesky ☁️");
  }
  if (!twitterClient) {
    throw new Error("Can't connect to Twitter 𝕏");
  }

  /* Profile sync */
  await profileSynchronizerService(
    twitterClient,
    mastodonClient,
    blueskyClient,
  );

  /* Posts sync */
  const postsSyncResponse = await postsSynchronizerService(
    twitterClient,
    mastodonClient,
    blueskyClient,
    synchronizedPostsCountThisRun,
  );
  synchronizedPostsCountAllTime.set(postsSyncResponse.metrics.totalSynced);

  console.log("\n𝕏 → 🦣+☁️");
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

await touitomamout();

if (DAEMON) {
  console.log(`Run daemon every ${SYNC_FREQUENCY_MIN}min`);
  setInterval(
    async () => {
      await touitomamout();
    },
    SYNC_FREQUENCY_MIN * 60 * 1000,
  );
}
