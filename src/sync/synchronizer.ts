import { Profile, Scraper as XClient } from "@the-convocation/twitter-scraper";
import { DBType } from "db";
import { Ora } from "ora";
import { ValidPost } from "types/post";
import * as z from "zod";

type SyncArgs = { log: Ora };
type ProfileArgs = SyncArgs & {
  readonly profile: Profile;
  //   readonly profileUpdate: ProfileUpdate;
};

export interface SynchronizerFactory<
  KEYS extends readonly string[],
  S extends z.ZodObject,
> {
  DISPLAY_NAME: string;
  PLATFORM_ID: string;
  EMOJI: string;
  ENV_KEYS: KEYS;
  STORE_SCHEMA: S;
  // Fallback environments. Used to set default values.
  FALLBACK_ENV?: Partial<Record<KEYS[number], string>>;
  // Create a Synchronizer. May throw errors
  create(args: {
    readonly xClient: XClient;
    readonly env: Record<KEYS[number], string>;
    readonly db: DBType;
    readonly slot: number;
    readonly log: Ora;
  }): Promise<Synchronizer<S>>;
}

export type PostSyncCache<S extends z.ZodObject> = {
  readonly platformStore: z.ZodSafeParseResult<z.infer<S>>;
};

export interface SynchronizerBase<S extends z.ZodObject> {
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
    args: SyncArgs &
      Partial<PostSyncCache<S>> & {
        readonly tweet: ValidPost;
      }
  ): Promise<z.infer<S> | void>;
}

export type Synchronizer<S extends z.ZodObject> = Partial<SynchronizerBase<S>>;
export type TaggedSynchronizer<S extends z.ZodObject = z.ZodObject> =
  Synchronizer<S> & {
    displayName: string;
    platformId: string;
    emoji: string;
    storeSchema: S;
  };
