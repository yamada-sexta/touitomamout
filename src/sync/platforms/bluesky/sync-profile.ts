import { Agent } from "@atproto/api";
import { Synchronizer } from "sync/synchronizer";

import { BlueskyPlatformStore } from "./types";
import { uploadBlueskyMedia } from "./utils/upload-bluesky-media";

export function syncProfile(args: {
  agent: Agent;
}): Synchronizer<typeof BlueskyPlatformStore> {
  const { agent } = args;
  return {
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
      const avatar = await uploadBlueskyMedia(args.pfpFile, agent);
      if (!avatar) {
        throw new Error("Failed to upload avatar");
      }
      await agent.upsertProfile((o) => ({
        ...o,
        avatar: avatar.data.blob,
      }));
    },

    syncBanner: async (args) => {
      const res = await uploadBlueskyMedia(args.bannerFile, agent);
      if (!res) {
        throw new Error("Unable to upload banner");
      }
      await agent.upsertProfile((o) => ({
        ...o,
        banner: res?.data.blob,
      }));
    },
  };
}
