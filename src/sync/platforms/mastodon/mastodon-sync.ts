import { DEBUG, SYNC_MASTODON, TWITTER_PASSWORD, VOID } from "env";
import { createRestAPIClient } from "masto";
import { MediaAttachment } from "masto/mastodon/entities/v1/index.js";
import { UpdateCredentialsParams } from "masto/mastodon/rest/v1/accounts.js";
import { splitTextForMastodon } from "sync/platforms/mastodon/text";
import { getPostStore } from "utils/get-post-store";
import { oraProgress } from "utils/logs";
import { getPostExcerpt } from "utils/post/get-post-excerpt";
import z from "zod";

import { SynchronizerFactory } from "../../synchronizer";

const KEYS = ["MASTODON_INSTANCE", "MASTODON_ACCESS_TOKEN"] as const;

export const MastodonStoreSchema = z.object({
  tootIds: z.array(z.string()),
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
    const { db, env } = args;

    const updateCredentials = async (args: UpdateCredentialsParams) =>
      await client.v1.accounts.updateCredentials(args);

    return {
      async syncBio(args) {
        await updateCredentials({ note: args.formattedBio });
      },
      async syncProfilePic(args) {
        const avatar = new File([args.pfpFile], "profile", {
          type: args.pfpFile.type,
        });
        await updateCredentials({ avatar });
      },
      async syncBanner(args) {
        const header = new File([args.bannerFile], "header", {
          type: args.bannerFile.type,
        });
        await updateCredentials({ header });
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

        const chunks = await splitTextForMastodon({
          tweet,
          db,
          mastodonInstance: env.MASTODON_INSTANCE,
          mastodonUsername: username,
        });

        // const dt = await downloadTweet(tweet);
        const attachments: MediaAttachment[] = [];

        let inReplyToId: undefined | string = undefined;
        if (tweet.inReplyToStatusId) {
          const store = await getPostStore({
            s: MastodonStoreSchema,
            db: db,
            tweet: tweet.inReplyToStatusId,
            platformId: MastodonSynchronizerFactory.PLATFORM_ID,
          });

          if (store.success) {
            [inReplyToId] = store.data.tootIds;
          }
        }
        for (const p of await tweet.photoFiles()) {
          if (DEBUG) console.log("uploading photo", p);
          if (!p.file) continue;
          // This somehow fix it?
          const file = new File([p.file], "upload.jpg", {
            type: p.file.type,
          });
          const a = await client.v2.media.create({
            file,
            description: p.alt_text ?? null,
          });

          attachments.push(a);
          if (DEBUG) console.log("uploaded");
        }

        for (const v of await tweet.videoFiles()) {
          if (DEBUG) console.log("uploading video", v);
          if (!v.file) {
            continue;
          }
          const file = new File([v.file], "upload.mp4", {
            type: v.file.type,
          });
          const a = await client.v2.media.create({
            file,
          });
          attachments.push(a);
          if (DEBUG) console.log("uploaded");
        }

        if (!attachments.length && !tweet.text) {
          log.warn(
            `🦣️ | post skipped: no compatible media nor text to post (tweet: ${tweet.id})`,
          );
          return;
        }

        log.text = `🦣 | toot sending: ${getPostExcerpt(tweet.text ?? VOID)}`;

        const tootIds: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const first = i === 0;
          const chunk = chunks[i];
          if (DEBUG) {
            console.log("mastodon post chunk: ", chunk);
          }

          const toot = await client.v1.statuses.create({
            status: chunk,
            visibility: "public",
            mediaIds: first ? attachments.map((m) => m.id) : undefined,
            inReplyToId: first ? inReplyToId : tootIds[i - 1],
            // i === 0 ? post.inReplyToId : chunkReferences[chunkIndex - 1],
          });

          oraProgress(log, { before: "🦣 | toot sending: " }, i, chunks.length);

          // Save toot ID to be able to reference it while posting the next chunk.
          tootIds.push(toot.id);
          // If this is the last chunk, save the all chunks ID to the cache.
          if (i === chunks.length - 1) {
            // log.succeed(
            //   `🦣 | toot sent: ${getPostExcerpt(tweet.text ?? VOID)}${tootIds.length > 1 ? ` (${tootIds.length} chunks)` : ""
            //   }`,
            // );
          }
        }

        return {
          store: {
            tootIds: tootIds,
          },
        };
      },
    };
  },
};
