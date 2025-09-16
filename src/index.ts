import { ProfileSynchronizer } from "services/profile/profile-synchronizer";
import { configuration } from "./configuration/configuration";
import {
  DAEMON,
  SYNC_FREQUENCY_MIN,
  TOUITOMAMOUT_VERSION,
  TWITTER_HANDLE,
} from "./env";
import {
  postsSynchronizerService,
} from "./services";
import { MastodonSynchronizer } from "services/profile/mastodon";
import { BlueskySynchronizer } from "services/profile/bluesky";
import { syncProfile } from "services/profile/sync";

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
const emojis: string[] = []

if (mastodonClient) {
  profileSynchronizers.push(
    new MastodonSynchronizer(mastodonClient)
  )
  emojis.push("🦣")
} else {
  console.log("🦣 Mastodon will not be synced...")
}

if (blueskyClient) {
  profileSynchronizers.push(
    new BlueskySynchronizer(blueskyClient)
  )
  emojis.push("☁️")
} else {
  console.log("☁️ Bluesky will not be synced...")
}

/**
 * Main syncing loop
 */
const touitomamout = async () => {
  await syncProfile(
    twitterClient, profileSynchronizers
  )

  /* Posts sync */
  const postsSyncResponse = await postsSynchronizerService(
    twitterClient,
    mastodonClient,
    blueskyClient,
    synchronizedPostsCountThisRun,
  );
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

// Register event
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT (Ctrl+C). Exiting...');
  process.exit(0);
});

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
