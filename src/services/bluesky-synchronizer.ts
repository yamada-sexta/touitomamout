import { uploadBlueskyMedia } from "helpers/medias/upload-bluesky-media";
import { SynchronizerFactory } from "./synchronizer";
import { BskyAgent, CredentialSession } from "@atproto/api";

const KEYS = [
  "BLUESKY_INSTANCE",
  "BLUESKY_IDENTIFIER",
  "BLUESKY_PASSWORD",
] as const;

export const BlueskySynchronizerFactory: SynchronizerFactory<typeof KEYS> = {
  ENV_KEYS: KEYS,
  FALLBACK_ENV: {
    BLUESKY_INSTANCE: "bsky.social",
  },

  create: async (args) => {
    let blueskyInstance = args.env.BLUESKY_INSTANCE;

    const session = new CredentialSession(
      new URL(`https://${blueskyInstance}`)
    );

    // ? there is literally no documentation on the alternative
    const agent = new BskyAgent(session);
    const identifier = args.env.BLUESKY_IDENTIFIER;
    const password = args.env.BLUESKY_PASSWORD;

    await agent.login({
      identifier,
      password,
    });

    args.log.succeed("connected to bluesky");

    return {
      name: "Bluesky",
      icon: "☁️",

      syncBio: async (args) => {
        await agent.upsertProfile((o) => ({
          ...o,
          description: args.formattedBio,
        }));
      },

      syncUserName: async (args) => {
        await agent.upsertProfile((o) => ({
          ...o,
          displayName: args.name,
        }));
      },

      syncProfilePic: async (args) => {
        const avatar = await uploadBlueskyMedia(args.pfpBlob, agent);
        if (!avatar) {
          throw new Error("Failed to upload avatar");
        }
        await agent.upsertProfile((o) => ({
          ...o,
          avatar: avatar.data.blob,
        }));
      },

      syncBanner: async (args) => {
        const res = await uploadBlueskyMedia(args.bannerBlob, agent);
        if (!res) {
          throw new Error("Unable to upload banner");
        }
        await agent.upsertProfile((o) => ({
          ...o,
          banner: res?.data.blob,
        }));
      },

      syncPost: async (args) => {
        
      },
    };
  },
};
