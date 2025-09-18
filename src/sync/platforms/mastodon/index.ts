import { DEBUG, SYNC_MASTODON, VOID } from "env";
import { createRestAPIClient } from "masto";
import { UpdateCredentialsParams } from "masto/mastodon/rest/v1/accounts.js";

import { SynchronizerFactory } from "../../synchronizer";
import z from "zod";
import { splitTextForMastodon } from "sync/platforms/mastodon/text";
import { getPostStore } from "utils/get-post-store";
import { downloadTweet } from "utils/tweet/download-tweet";
import { MediaAttachment } from "masto/mastodon/entities/v1/index.js";
import { MastodonCacheChunk } from "types";
import { getPostExcerpt } from "utils/post/get-post-excerpt";
import { oraProgress } from "utils/logs";

const KEYS = ["MASTODON_INSTANCE", "MASTODON_ACCESS_TOKEN"] as const;
export const MastodonStoreSchema = z.object({
  tootId: z.string(),
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

        const chunks = await splitTextForMastodon({
          tweet,
          db,
          mastodonInstance: env.MASTODON_INSTANCE,
          mastodonUsername: username,
        });

        const dt = await downloadTweet(tweet);
        const attachments: MediaAttachment[] = [];

        let inReplyToId = undefined;
        if (tweet.inReplyToStatusId){
  const store = await getPostStore({
    s: MastodonStoreSchema,
    db: db,
    tweet: tweet.inReplyToStatusId,
    platformId: MastodonSynchronizerFactory.PLATFORM_ID,
  });

    if (store.success) {
      inReplyToId = store.data.tootId;
    
    }
        }
        


        for (const p of dt.photos) {
          if (!p.blob) {
            continue;
          }
          const a = await client.v2.media.create({
            file: p.blob,
            description: p.alt_text,
          });
          attachments.push(a);
        }

        for (const v of dt.videos) {
          if (!v.blob) {
            continue;
          }
          const a = await client.v2.media.create({
            file: v.blob,
          });
          attachments.push(a);
        }

        if (!attachments.length && !tweet.text) {
          log.warn(
            `🦣️ | post skipped: no compatible media nor text to post (tweet: ${tweet.id})`
          );
          return;
        }

        log.text = `🦣 | toot sending: ${getPostExcerpt(tweet.text ?? VOID)}`;

        const chunkReferences: MastodonCacheChunk[] = [];

            for (let i = 0; i < chunks.length; i++) {
              const first = i === 0;
              const chunk = chunks[i];
              if (DEBUG) {
                console.log("mastodon post chunk: ", chunk);
              }

              const toot = await client.v1.statuses.create({
                status: chunk,
                visibility: "public",
                // mediaIds: i === 0 ? mediaAttachments.map((m) => m.id) : [],
                mediaIds: first ? attachments.map((m) => m.id) : [],
                inReplyToId: first ? inReplyToId : chunkReferences[i - 1],
                // i === 0 ? post.inReplyToId : chunkReferences[chunkIndex - 1],
              });

              oraProgress(
                log,
                { before: "🦣 | toot sending: " },
                i,
chunks.length
              );

              // Save toot ID to be able to reference it while posting the next chunk.
              chunkReferences.push(toot.id);
              // If this is the last chunk, save the all chunks ID to the cache.
              if (i === chunks.length - 1) {
                log.succeed(
                  `🦣 | toot sent: ${getPostExcerpt(tweet.text ?? VOID)}${
                    chunkReferences.length > 1
                      ? ` (${chunkReferences.length} chunks)`
                      : ""
                  }`
                );

                // await savePostToCache({
                //   tweetId: .tweet.id,
                //   data: chunkReferences,
                //   platform: Platform.MASTODON,
                //   cachePath: getCachePath(this.twitterHandle),
                // });
              }
            }

            return {
              toot: chunkReferences[0],
            };
      },
    };
  },
};
