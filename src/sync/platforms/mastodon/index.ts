import { SYNC_MASTODON } from "env";
import { createRestAPIClient } from "masto";
import { UpdateCredentialsParams } from "masto/mastodon/rest/v1/accounts.js";

import { SynchronizerFactory } from "../../synchronizer";
import z from "zod";
import { splitTextForMastodon } from "utils/mastodon/text";

const KEYS = ["MASTODON_INSTANCE", "MASTODON_ACCESS_TOKEN"] as const;
const MastodonStoreSchema = z.object({
  toodId: z.string(),
});
type MastodonStoreSchemaType = typeof MastodonStoreSchema;

export const MastodonSynchronizerFactory: SynchronizerFactory<
  typeof KEYS,
  MastodonStoreSchemaType
> = {
  DISPLAY_NAME: "Mastodon",
  PLATFORM_ID: "mastodon",
  STORE_SCHEMA: MastodonStoreSchema,
  EMOJI: "🦣",
  ENV_KEYS: KEYS,
  FALLBACK_ENV: {
    MASTODON_INSTANCE: "mastodon.social",
  },
  create: async (args) => {
    if (!SYNC_MASTODON) {
      throw new Error("Mastodon will not be synced");
    }
    const client = createRestAPIClient({
      url: `https://${args.env.MASTODON_INSTANCE}`,
      accessToken: args.env.MASTODON_ACCESS_TOKEN,
    });
    await client.v1.accounts.verifyCredentials();

    const updateCredentials = async (args: UpdateCredentialsParams) =>
      await client.v1.accounts.updateCredentials(args);

    return {
      async syncBio(args) {
        await updateCredentials({ note: args.formattedBio });
      },
      async syncProfilePic(args) {
        await updateCredentials({ avatar: args.pfpBlob });
      },
      async syncBanner(args) {
        await updateCredentials({ header: args.bannerBlob });
      },
      async syncUserName(args) {
        await updateCredentials({ displayName: args.name });
      },

      async syncPost(args) {
        const { tweet, log } = args;
        if (args.store.success) {
          args.log.info("skipping...");
          return {
            store: args.store.data,
          };
        }

        const username = await client.v1.accounts
          .verifyCredentials()
          .then((account) => account.username);
  const chunks = await splitTextForMastodon(tweet, username);


      },
    };
  },
};
