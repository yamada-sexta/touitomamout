import { Profile, Scraper } from "@the-convocation/twitter-scraper";
import { Ora } from "ora";
import { ProfileUpdate } from "types/profile";

export interface ProfileSynchronizer {
    sync(args: {
        twitterClient: Scraper,
        profile: Profile,
        log: Ora,
        avatarBlob?: Blob,
        bannerBlob?: Blob,
        profileUpdate: ProfileUpdate
    }): Promise<void>
}