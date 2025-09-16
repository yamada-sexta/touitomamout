import {
    Profile,
    Tweet,
    Scraper as XClient,
} from "@the-convocation/twitter-scraper";
import { DBType } from "db";
import { Ora } from "ora";
import { Media } from "types";
import { ProfileUpdate } from "types/profile";

type SyncArgs = { log: Ora };
type ProfileArgs = SyncArgs & {
    readonly profile: Profile;
    readonly profileUpdate: ProfileUpdate;
};

export interface SynchronizerFactory<K extends readonly string[]> {
    ENV_KEYS: K;
    // Fallback environments. Used to set default values.
    FALLBACK_ENV?: Partial<Record<K[number], string>>;
    // Create a Synchronizer. May throw errors
    create(args: {
        readonly xClient: XClient;
        readonly env: Record<K[number], string>;
        readonly envKeys: K;
        readonly db: DBType;
        readonly slot: number;
        readonly log: Ora;
    }): Promise<Synchronizer>;
}

export interface SynchronizerBase {
    syncBio(
        args: ProfileArgs & {
            readonly bio: string;
            readonly formattedBio: string;
        }
    ): Promise<void>;

    syncUserName(args: ProfileArgs & { readonly name: string }): Promise<void>;

    syncProfilePic(args: ProfileArgs & { readonly pfpBlob: Blob }): Promise<void>;

    syncBanner(args: ProfileArgs & { readonly bannerBlob: Blob }): Promise<void>;

    syncPost(
        args: SyncArgs & {
            readonly tweet: Tweet;
            readonly mediaList: Media[];
        }
    ): Promise<void>;
}

export type Synchronizer = Partial<SynchronizerBase> & {
    name: string;
    icon: string;
};
