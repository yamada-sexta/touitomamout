
import { mastodon } from "masto";
import { Profile } from "@the-convocation/twitter-scraper";
import { Ora } from "ora";
import {
    SYNC_PROFILE_DESCRIPTION,
    SYNC_PROFILE_HEADER,
    SYNC_PROFILE_NAME,
    SYNC_PROFILE_PICTURE,
} from "env";
import { shortenedUrlsReplacer } from "../../utils/url/shortened-urls-replacer";
import { ProfileSynchronizer } from "./profile-synchronizer";
import { ProfileUpdate } from "types/profile";
import { UpdateCredentialsParams } from "masto/mastodon/rest/v1/accounts.js";


type Writeable<T> = { -readonly [K in keyof T]: T[K] };
type MutableCredentialsParams = Writeable<UpdateCredentialsParams>;

export class MastodonProfileSynchronizer implements ProfileSynchronizer {
    constructor(private client: mastodon.rest.Client) { }

    public async sync(args: {
        profile: Profile;
        log: Ora;
        avatarBlob?: Blob;
        bannerBlob?: Blob;
        profileUpdate: ProfileUpdate;
    }): Promise<void> {
        const { profile, log, avatarBlob, bannerBlob, profileUpdate } = args;
        log.text = "building mastodon update...";

        const params: MutableCredentialsParams = {};

        // Build the Mastodon-specific parameters
        if (SYNC_PROFILE_DESCRIPTION) {
            params.note = await shortenedUrlsReplacer(profile.biography || "");
        }

        if (SYNC_PROFILE_NAME) {
            params.displayName = profile.name;
        }

        if (
            SYNC_PROFILE_PICTURE &&
            avatarBlob instanceof Blob &&
            profileUpdate.avatar.required
        ) {
            params.avatar = avatarBlob;
        }

        if (
            SYNC_PROFILE_HEADER &&
            bannerBlob instanceof Blob &&
            profileUpdate.banner.required
        ) {
            params.header = bannerBlob;
        }

        // Execute the update if there's anything to change
        if (Object.keys(params).length > 0) {
            log.text = "sending to mastodon...";
            await this.client.v1.accounts.updateCredentials(params);
        }
    }
}