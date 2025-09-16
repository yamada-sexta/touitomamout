import { AppBskyActorProfile, AtpAgent, Un$Typed } from "@atproto/api";
import { Profile } from "@the-convocation/twitter-scraper";
import { Ora } from "ora";
import {
    SYNC_PROFILE_DESCRIPTION,
    SYNC_PROFILE_HEADER,
    SYNC_PROFILE_NAME,
    SYNC_PROFILE_PICTURE,
} from "../../env";
import { ProfileUpdate } from "types/profile";
import { uploadBlueskyMedia } from "helpers/medias/upload-bluesky-media";
import { ProfileSynchronizer } from "./profile-synchronizer";
import { shortenedUrlsReplacer } from "helpers/url/shortened-urls-replacer";

export class BlueskyProfileSynchronizer implements ProfileSynchronizer {
    constructor(private client: AtpAgent) { }

    public async sync(args: {
        profile: Profile;
        log: Ora;
        avatarBlob?: Blob;
        bannerBlob?: Blob;
        profileUpdate: ProfileUpdate;
    }): Promise<void> {
        const { profile, log, avatarBlob, bannerBlob, profileUpdate } = args;

        // Phase 1: Platform-specific media upload
        log.text = "preparing bluesky media...";
        const blueskyAvatar =
            avatarBlob && profileUpdate.avatar.required
                ? await uploadBlueskyMedia(avatarBlob, this.client)
                : null;

        const blueskyBanner =
            bannerBlob && profileUpdate.banner.required
                ? await uploadBlueskyMedia(bannerBlob, this.client)
                : null;

        // Phase 2: Build update payload
        log.text = "building bluesky update...";

        const params: Un$Typed<AppBskyActorProfile.Record> = {};

        if (SYNC_PROFILE_DESCRIPTION) {
            params.description = await shortenedUrlsReplacer(profile.biography || "");
        }

        if (SYNC_PROFILE_NAME) {
            params.displayName = profile.name;
        }

        if (SYNC_PROFILE_PICTURE && blueskyAvatar?.data.blob) {
            params.avatar = blueskyAvatar.data.blob;
        }

        if (SYNC_PROFILE_HEADER && blueskyBanner?.data.blob) {
            params.banner = blueskyBanner.data.blob;
        }

        // Phase 3: Execute update
        if (Object.keys(params).length > 0) {
            log.text = "sending to bluesky...";
            await this.client.upsertProfile((old) => ({
                ...old,
                ...params,
            }));
        }
    }
}