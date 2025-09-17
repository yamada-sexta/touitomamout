import type { Scraper } from "@the-convocation/twitter-scraper";
import ora from "ora";
import { updateCacheEntry } from "helpers/cache/update-cache-entry";
import { oraPrefixer } from "helpers/logs";
import { getBlobHashOrNull } from "helpers/profile/build-profile-update";
import { ProfileCache } from "types";
import { download } from "helpers/download-media";
import { SYNC_PROFILE_HEADER, SYNC_PROFILE_PICTURE, TwitterHandle } from "env";
import { getCachePath } from "configuration/configuration";
import { Synchronizer } from "./synchronizer";
import { DBType, Schema } from "db";
import { eq } from "drizzle-orm";

/**
 * An async method that fetches a Twitter profile and dispatches 
 * synchronization tasks to configured platforms.
 */
export async function syncProfile(args: {
  twitterHandle: TwitterHandle;
  twitterClient: Scraper;
  synchronizers: Synchronizer[];
  db:DBType
}): Promise<void> {
  const { twitterClient, synchronizers } = args;
  const log = ora({
    color: "cyan",
    prefixText: oraPrefixer("profile-sync"),
  }).start();
  log.text = "parsing";
  // --- COMMON LOGIC: FETCH ---
  const profile = await twitterClient.getProfile(args.twitterHandle.handle);

  // --- COMMON LOGIC: MEDIA PREP ---
  log.text = `avatar: ↓ downloading`;
  const avatarBlob = await download(profile.avatar?.replace("_normal", ""))
  const avatarHash = await getBlobHashOrNull(avatarBlob)??"";

  log.text = `banner: ↓ downloading`;
  const bannerBlob = await download(profile.banner);
  const bannerHash = await getBlobHashOrNull(bannerBlob)??"";

  log.text = "checking media cache...";
  const cache = await args.db
    .select({
      avatarHash: Schema.TwitterProfileCache.avatarHash,
      bannerHash: Schema.TwitterProfileCache.bannerHash,
    })
    .from(Schema.TwitterProfileCache)
      .where(eq(Schema.TwitterProfileCache.userId, args.twitterHandle.handle));
let localAvatarCache = null;
let localBannerHash = null;
    if (cache.length<1){
         localAvatarCache = cache[0].avatarHash;
         localBannerHash = cache[0].bannerHash;
    }

const jobs: Promise<void> []= [];

if (SYNC_PROFILE_PICTURE && avatarHash != localAvatarCache && avatarBlob) {
  jobs.push(
    ...args.synchronizers
      .filter((s) => s.syncProfilePic)
      .map((s) =>
        s.syncProfilePic!({
          log,
          profile,
          pfpBlob: avatarBlob,
        })
      )
  );
}

if (SYNC_PROFILE_HEADER&& bannerHash!=localBannerHash &&bannerBlob){
      jobs.push(
        ...args.synchronizers
          .filter((s) => s.syncBanner)
          .map((s) =>
            s.syncBanner!({
              log,
              profile,
              bannerBlob,
            })
          )
      );
}

  // 2. Bundle the common arguments
  const syncArgs = {
    twitterClient,
    profile,
    log,
    avatarBlob,
    bannerBlob,
    profileUpdate,
  };

  // 3. Run all synchronization tasks in parallel
  log.text = "dispatching sync tasks...";
  try {
    await Promise.all(synchronizers.map((s) => s.sync(syncArgs)));
  } catch (error) {
    if (error instanceof Error) {
      log.fail(`Error during synchronization: ${error.message}`);
    } else {
      // Handle cases where a non-Error value is thrown (e.g., throw "oops")
      log.fail(`An unknown error occurred during sync: ${String(error)}`);
    }
  }

  // --- COMMON LOGIC: CACHE UPDATE ---
  log.text = "updating cache...";
  await updateCacheEntry(
    "profile",
    Object.entries(profileUpdate).reduce((updated, [type, { hash }]) => {
      // Only update the cache if a hash was successfully generated
      if (hash) {
        return {
          ...updated,
          [type]: hash,
        };
      }
      return updated;
    }, {} as ProfileCache),
    {
      cachePath: getCachePath(args.twitterHandle),
    }
  );

  log.succeed("task finished");
};