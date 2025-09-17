import type { Scraper } from "@the-convocation/twitter-scraper";
import ora from "ora";
import { oraPrefixer } from "helpers/logs";
import { getBlobHashOrNull } from "helpers/profile/build-profile-update";
import { download } from "helpers/download-media";
import { SYNC_PROFILE_DESCRIPTION, SYNC_PROFILE_HEADER, SYNC_PROFILE_NAME, SYNC_PROFILE_PICTURE, TwitterHandle } from "env";
import { Synchronizer } from "./synchronizer";
import { DBType, Schema } from "db";
import { eq } from "drizzle-orm";
import { shortenedUrlsReplacer } from "helpers/url/shortened-urls-replacer";

async function upsertProfileCache(args:
  { db: DBType, userId: string, avatarHash: string, bannerHash: string }): Promise<{
    avatarChanged: boolean, bannerChanged: boolean;
  }> {
  const { db, userId, avatarHash, bannerHash } = args;
  // Fetch the latest row to compare in TS
  const rows = await db
    .select({
      avatarHash: Schema.TwitterProfileCache.avatarHash,
      bannerHash: Schema.TwitterProfileCache.bannerHash,
    })
    .from(Schema.TwitterProfileCache)
    .where(eq(Schema.TwitterProfileCache.userId, userId));

  let localA = ""
  let localB = ""
  if (rows.length > 0) {
    const [{ avatarHash, bannerHash }] = rows;
    localA = avatarHash;
    localB = bannerHash;
  }

  // Upsert (insert or update) the cache row
  await db
    .insert(Schema.TwitterProfileCache)
    .values({
      userId,
      avatarHash: avatarHash ?? "",
      bannerHash: bannerHash ?? "",
    })
    .onConflictDoUpdate({
      target: Schema.TwitterProfileCache.userId,
      set: {
        avatarHash: avatarHash ?? "",
        bannerHash: bannerHash ?? "",
      },
    });

  return {
    avatarChanged: localA === avatarHash,
    bannerChanged: localB === bannerHash,
  };
}

/**
 * An async method that fetches a Twitter profile and dispatches 
 * synchronization tasks to configured platforms.
 */
export async function syncProfile(args: {
  twitterHandle: TwitterHandle;
  twitterClient: Scraper;
  synchronizers: Synchronizer[];
  db: DBType
}): Promise<void> {
  const { twitterClient, synchronizers, db } = args;
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
  const avatarHash = await getBlobHashOrNull(avatarBlob) ?? "";

  log.text = `banner: ↓ downloading`;
  const bannerBlob = await download(profile.banner);
  const bannerHash = await getBlobHashOrNull(bannerBlob) ?? "";

  log.text = "checking media cache...";
  const { avatarChanged, bannerChanged } = await upsertProfileCache({ db, userId: args.twitterHandle.handle, avatarHash, bannerHash })

  const jobs: Promise<void>[] = [];

  if (SYNC_PROFILE_PICTURE && avatarChanged && avatarBlob) {
    jobs.push(
      ...synchronizers
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

  if (SYNC_PROFILE_HEADER && bannerChanged && bannerBlob) {
    jobs.push(
      ...synchronizers
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

  if (SYNC_PROFILE_DESCRIPTION && profile.biography) {
    const formattedBio = await shortenedUrlsReplacer(profile.biography)
    jobs.push(
      ...synchronizers.filter(s => s.syncBio).map(
        s => s.syncBio!(
          {
            log,
            profile,
            bio: profile.biography!,
            formattedBio
          }
        )
      )
    )
  }

  if (SYNC_PROFILE_NAME && profile.name) {
    jobs.push(
      ...synchronizers.filter(s => s.syncUserName).map(
        s => s.syncUserName!(
          {
            log,
            profile,
            name: profile.name!
          }
        )
      )
    )
  }

  // console.log(profile)

  // 3. Run all synchronization tasks in parallel
  log.text = "dispatching sync tasks...";
  try {
    await Promise.all(jobs);
  } catch (error) {
    if (error instanceof Error) {
      log.fail(`Error during synchronization: ${error.message}`);
    } else {
      // Handle cases where a non-Error value is thrown (e.g., throw "oops")
      log.fail(`An unknown error occurred during sync: ${String(error)}`);
    }
  }
  log.succeed("task finished");
  log.stop()
};