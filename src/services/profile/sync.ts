import type { Scraper } from "@the-convocation/twitter-scraper";
import ora from "ora";
import { TWITTER_HANDLE } from "env";
import { updateCacheEntry } from "helpers/cache/update-cache-entry";
import { oraPrefixer } from "helpers/logs";
import { buildProfileUpdate } from "helpers/profile/build-profile-update";
import { ProfileCache } from "types";
// import { downloadMedia } from "../../helpers/download-media";
import { ProfileSynchronizer } from "./profile-synchronizer";
import { downloadMedia } from "helpers/download-media";

/**
 * An async method that fetches a Twitter profile and dispatches 
 * synchronization tasks to configured platforms.
 */
export async function syncProfile(
    args: {twitterClient: Scraper,
    synchronizers: ProfileSynchronizer[]}
): Promise<void> {
    const {twitterClient, synchronizers} = args;
    const log = ora({
        color: "cyan",
        prefixText: oraPrefixer("profile-sync"),
    }).start();
    log.text = "parsing";

    // --- COMMON LOGIC: FETCH ---
    const profile = await twitterClient.getProfile(TWITTER_HANDLE);

    // --- COMMON LOGIC: MEDIA PREP ---
    log.text = `avatar: ↓ downloading`;
    const avatarBlob = profile.avatar
        ? await downloadMedia(profile.avatar.replace("_normal", ""))
        : undefined;

    log.text = `banner: ↓ downloading`;
    const bannerBlob = profile.banner
        ? await downloadMedia(profile.banner)
        : undefined;

    log.text = "checking media cache...";
    const profileUpdate = await buildProfileUpdate(
        {
            avatar: avatarBlob,
            banner: bannerBlob,
        },
        log,
    );

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
    );

    log.succeed("task finished");
};