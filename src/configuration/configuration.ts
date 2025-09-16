import pm2 from "@pm2/io";
import type Counter from "@pm2/io/build/main/utils/metrics/counter";
import type Gauge from "@pm2/io/build/main/utils/metrics/gauge";
import { Scraper } from "@the-convocation/twitter-scraper";
import ora from "ora";
import {
  STORAGE_DIR,
  SYNC_DRY_RUN,
  TwitterHandle,
} from "../env";
import { handleTwitterAuth } from "../helpers/auth/handle-twitter-auth";
import { createCacheFile } from "../helpers/cache/create-cache";
import { getCachedPosts } from "../helpers/cache/get-cached-posts";
import { runMigrations } from "../helpers/cache/run-migrations";
import { oraPrefixer } from "../helpers/logs";
import { createBlueskyClient } from "./bluesky";
import { createMastodonClient } from "./mastodon";
import { ProfileSynchronizer } from "services/profile/profile-synchronizer";
import { PostSynchronizer } from "services/posts/post-sender";
import { MastodonProfileSynchronizer } from "services/profile/mastodon";
import { MastodonPostSynchronizer } from "services/posts/mastodon";
import { BlueskyProfileSynchronizer } from "services/profile/bluesky";
import { BlueskyPostSynchronizer } from "services/posts/bluesky";

export function getCachePath(twitterHandle: TwitterHandle) {
  return `${STORAGE_DIR}/cache.${twitterHandle.handle}.json`;
}

export async function configuration(args: {
  twitterHandle: TwitterHandle,
}): Promise<{
  synchronizedPostsCountAllTime: Gauge;
  synchronizedPostsCountThisRun: Counter;
  twitterClient: Scraper;
  profileSynchronizers: ProfileSynchronizer[]
  postSynchronizers: PostSynchronizer[]
  emojis: string[]
}> {
  const profileSynchronizers: ProfileSynchronizer[] = []
  const postSynchronizers: PostSynchronizer[] = []
  const emojis: string[] = [];

  if (SYNC_DRY_RUN) {
    ora({
      color: "gray",
      prefixText: oraPrefixer("✌️ dry run"),
    }).info("mode enabled (no post will be posted)");
  }

  // Init configuration
  const cachePath = getCachePath(args.twitterHandle)
  await createCacheFile({
    cachePath, instanceId: args.twitterHandle.handle
  });
  await runMigrations({
    cachePath, instanceId: args.twitterHandle.handle
  });

  const synchronizedPostsCountThisRun = pm2.counter({
    name: "Synced posts this run",
    id: "app/historic/sync/run",
  });

  const synchronizedPostsCountAllTime = pm2.metric({
    name: "Synced posts total",
    id: "app/historic/sync/all_time",
  });
  synchronizedPostsCountAllTime.set(Object.keys(await getCachedPosts()).length);

  const synchronizedHandle = pm2.metric({
    name: "User handle",
    id: "app/schema/username",
  });
  synchronizedHandle.set(`@${args.twitterHandle}`);

  const twitterClient = new Scraper();

  await handleTwitterAuth(twitterClient);

  const mastodonClient = await createMastodonClient({ handle: args.twitterHandle });

  if (mastodonClient) {
    profileSynchronizers.push(
      new MastodonProfileSynchronizer(mastodonClient)
    )
    postSynchronizers.push(
      new MastodonPostSynchronizer(mastodonClient, args.twitterHandle)
    )
    emojis.push("🦣")
  } else {
    console.log(`🦣 Mastodon will not be synced for ${args.twitterHandle.handle}`)
  }

  const [blueskyClient, identifier] = await createBlueskyClient({ handle: args.twitterHandle }) || [undefined, undefined];
  if (blueskyClient) {
    profileSynchronizers.push(
      new BlueskyProfileSynchronizer(blueskyClient)
    )
    postSynchronizers.push(
      new BlueskyPostSynchronizer(blueskyClient, args.twitterHandle, identifier)
    )
    emojis.push("☁️")
  } else {
    console.log(`☁️ Bluesky will not be synced ${args.twitterHandle.handle}`)
  }

  return {
    twitterClient,
    synchronizedPostsCountAllTime,
    synchronizedPostsCountThisRun,
    profileSynchronizers,
    postSynchronizers,
    emojis
  };
};
