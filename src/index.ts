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
import {
  DAEMON,
  SYNC_FREQUENCY_MIN,
  TOUITOMAMOUT_VERSION,
  TWITTER_HANDLES,
  TWITTER_PASSWORD,
  TWITTER_USERNAME,
  TwitterHandle,
} from "./env";
// import { syncProfile } from "services/profile/sync";
// import { syncPosts } from "services/posts/sync";
import { BlueskySynchronizerFactory } from "services/bluesky-synchronizer";
import { createTwitterClient } from "services/profile/x-client";
import { db } from "db";
import { TaggedSynchronizer } from "services/synchronizer";
import ora from "ora";
import { oraPrefixer } from "utils/logs";
import { syncProfile } from "services/sync-profile";
import { MastodonSynchronizerFactory } from "services/mastodon-synchronizer";
import { logError } from "utils/logs/log-error";
import { syncPosts } from "services/sync-posts";

const factories = [BlueskySynchronizerFactory, MastodonSynchronizerFactory] as const;

const twitterClient = await createTwitterClient({
  twitterPassword: TWITTER_PASSWORD,
  twitterUsername: TWITTER_USERNAME,
  db,
});

// type NamedSynchronizer = Synchronizer & {
//   name: string;
//   emoji: string;
// };

const users: SyncUser[] = [];
interface SyncUser {
  handle: TwitterHandle;
  synchronizers: TaggedSynchronizer[];
}

for (const handle of TWITTER_HANDLES) {
  console.log(`Connecting @${handle.handle}...`)
  const synchronizers: TaggedSynchronizer[] = [];
  for (const factory of factories) {
    const log = ora({
      color: "gray",
      prefixText: oraPrefixer(`${factory.EMOJI} client`),
    }).start(`Connecting to ${factory.DISPLAY_NAME}`);

    const envKeys = factory.ENV_KEYS;
    type K = (typeof factory.ENV_KEYS)[number];
    const fallback = factory.FALLBACK_ENV ?? {};
    type EnvType = Record<K, string>;
    const env: typeof factory.FALLBACK_ENV = {};
    let skip = false;
    for (const key of envKeys) {
      const osKey = key + handle.postFix;
      const val = process.env[osKey] || fallback[key as keyof typeof fallback] as string | undefined;
      if (!val) {
        log.warn(
          `skip ${factory.DISPLAY_NAME} because "${osKey}" is not set.`
        );
        // console.warn(`Because ${osKey} is not set.`);
        skip = true;
        break;
      }
      //@ts-ignore
      env[key as string] = val;
    }
    if (skip) {
      continue;
    }


    try {
      const s = await factory.create({
        xClient: twitterClient,
        env: env as EnvType,
        db: db,
        slot: handle.slot,
        log
      });
      synchronizers.push({ ...s, displayName: factory.DISPLAY_NAME, emoji: factory.EMOJI, platformId: factory.PLATFORM_ID });
      log.succeed("connected")
    } catch (error) {
      logError(log, error)`Failed to connect to ${factory.DISPLAY_NAME}: ${error}`
    }
    finally {
      log.stop();
    }
  }

  users.push({
    handle,
    synchronizers,
  });
}


/**
 * Main syncing loop
 */
const syncAll = async () => {
  if (!users) {
    throw Error("Unable to sync anything...");
  }

  for await (const user of users) {
    console.log(`\n𝕏 ->  ${user.synchronizers.map((s) => s.emoji).join(" + ")}`);
    console.log(`| @${user.handle.handle}`);
    await syncProfile({
      x: twitterClient, twitterHandle: user.handle, synchronizers: user.synchronizers, db
    })

    await syncPosts({
      db, handle: user.handle, x: twitterClient, synchronizers: user.synchronizers
    })

    // await syncProfile({
    //   twitterClient: client.twitter,
    //   synchronizers: client.profileSynchronizers,
    //   twitterHandle: client.twitterHandle,
    // });
    // /* Posts sync */
    // const postsSyncResponse = await syncPosts({
    //   twitterClient: client.twitter,
    //   syncCount: client.thisRunCount,
    //   synchronizers: client.postSynchronizers,
    //   twitterHandle: client.twitterHandle.handle,
    // });

    // client.allTimeCount.set(postsSyncResponse.metrics.totalSynced);
    // console.log(
    //   `| just synced ${postsSyncResponse.metrics.justSynced} post(s)`
    // );
    // console.log(
    //   `| ${postsSyncResponse.metrics.totalSynced} post(s) synced so far`
    // );
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
