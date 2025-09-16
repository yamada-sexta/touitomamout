import {
  Profile,
  Tweet,
  Scraper as XClient,
} from "@the-convocation/twitter-scraper";
import { Ora } from "ora";
import { Media } from "types";
import { ProfileUpdate } from "types/profile";

type SyncArgs = { log: Ora };
type ProfileArgs = SyncArgs & {
  profile: Profile;
  profileUpdate: ProfileUpdate;
};

export interface SynchronizerFactory<K extends readonly string[]> {
  ENV_KEYS: K;
  // Fallback environments. Used to set default values.
  FALLBACK_ENV?: Partial<Record<K[number], string>>;
  // Create a Synchronizer. May throw errors
  create(args: {
    xClient: XClient;
    env: Record<K[number], string>;
    envKeys: K;
    slot: number;
    log: Ora;
  }): Promise<Synchronizer>;
}

export interface SynchronizerBase {
  syncBio(
    args: ProfileArgs & {
      bio: string;
      formattedBio: string;
    }
  ): Promise<void>;

  syncUserName({
    log,
    profile,
    name,
    profileUpdate,
  }: ProfileArgs & { name: string }): Promise<void>;

  syncProfilePic({
    log,
    profile,
    pfpBlob,
    profileUpdate,
  }: ProfileArgs & { pfpBlob: Blob }): Promise<void>;

  syncBanner({
    log,
    profile,
    bannerBlob,
    profileUpdate,
  }: ProfileArgs & { bannerBlob: Blob }): Promise<void>;

  syncPost(
    args: SyncArgs & {
      tweet: Tweet;
      mediaList: Media[];
    }
  ): Promise<void>;
}

export type Synchronizer = Partial<SynchronizerBase> & {
  name: string;
  icon: string;
};
