import { uploadBlueskyMedia } from "utils/bluesky/upload-bluesky-media";
import { SynchronizerFactory } from "./synchronizer";
import { $Typed, Agent, AppBskyEmbedExternal, AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyEmbedRecordWithMedia, AppBskyEmbedVideo, AppBskyFeedPost, BskyAgent, ComAtprotoRepoUploadBlob, CredentialSession, RichText } from "@atproto/api";
import ora from "ora";
import { getPostStore } from "./get-post-store";
import { BlueskyPost } from "types/post";
import { splitTextForBluesky } from "utils/tweet/split-tweet-text";
import { downloadTweet } from "utils/tweet/download-tweet";
import { parseBlobForBluesky } from "utils/bluesky/parse-blob-for-bluesky";
import { logError } from "utils/logs/log-error";
import { createMediaRecord } from "utils/bluesky/create-media-record";
import { BlueskyCacheChunk } from "types";
import { BACKDATE_BLUESKY_POSTS, DEBUG, VOID } from "env";
import { Image as BlueskyImage } from "@atproto/api/dist/client/types/app/bsky/embed/images";
import { Photo } from "@the-convocation/twitter-scraper";
import { buildReplyEntry, getBlueskyChunkLinkMetadata } from "utils/bluesky";
import { getPostExcerpt } from "utils/post/get-post-excerpt";
import { oraProgress } from "utils/logs";

interface PostRef {
  cid: string;
  rkey: string;
}
function isPostRef(value: unknown): value is PostRef {
  return (
    typeof value === 'object' && // It's an object...
    value !== null &&           // ...and not null...
    'cid' in value &&           // ...with a 'cid' property...
    'rkey' in value &&          // ...and a 'rkey' property...
    typeof (value as PostRef).cid === 'string' && // ...and they are both strings.
    typeof (value as PostRef).rkey === 'string'
  );
}
function isPostRefArray(value: unknown): value is PostRef[] {
  // It must be an array AND every element must pass the isPostRef check.
  return Array.isArray(value) && value.every(isPostRef);
}

const KEYS = [
  "BLUESKY_INSTANCE",
  "BLUESKY_IDENTIFIER",
  "BLUESKY_PASSWORD",
] as const;

const BLUESKY_MEDIA_IMAGES_MAX_COUNT = 4;
const RKEY_REGEX = /\/(?<rkey>\w+)$/;

export async function getExternalEmbedding(richText: RichText, agent: Agent): Promise<
  $Typed<AppBskyEmbedExternal.Main> | undefined> {
  try {
    const card = await getBlueskyChunkLinkMetadata(richText, agent);
    const externalRecord: $Typed<AppBskyEmbedExternal.Main> | undefined = card
      ? {
        $type: "app.bsky.embed.external",
        external: {
          uri: card.url,
          title: card.title,
          description: card.description,
          thumb: card.image?.data.blob,
          $type: "app.bsky.embed.external#external",
        },
      }
      : undefined;
    return externalRecord;
  } catch (e) {
    return undefined
  }
}

export const BlueskySynchronizerFactory: SynchronizerFactory<typeof KEYS> = {
  DISPLAY_NAME: "Bluesky",
  PLATFORM_ID: "bluesky",
  EMOJI: "☁️",
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
    const platformId = BlueskySynchronizerFactory.PLATFORM_ID;
    const env = args.env;
    const db = args.db;

    await agent.login({
      identifier,
      password,
    });

    async function getPostFromTid(tid?: string): Promise<
      ReturnType<typeof agent.getPost> | void> {
      if (!tid) return;

      const str = await getPostStore({ db, platformId, tweet: tid })
      if (!str) return;

      const storeArray = JSON.parse(str.platformStore) as PostRef[] | unknown;

      if (isPostRefArray(storeArray)) {
        if (!storeArray.length) return;
        const [store] = storeArray;
        const post = await agent.getPost({
          cid: store.cid, rkey: store.rkey, repo: env.BLUESKY_IDENTIFIER
        })
        return post;
      }
    }


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
        const { tweet, log } = args;
        if (args.platformStore) {
          args.log.info("skipping...")
          return {
            platformStore: args.platformStore
          }
        }
        const username = await agent
          .getProfile({ actor: env.BLUESKY_IDENTIFIER })
          .then((account) => account.data.handle);

        const quotePost = await getPostFromTid(tweet?.quotedStatus?.id) ?? undefined;
        const replyPost = await getPostFromTid(tweet.inReplyToStatusId) ?? undefined;

        const richText = new RichText({ text: tweet.text ?? "" });
        await richText.detectFacets(agent);

        const post: BlueskyPost = {
          chunks: await splitTextForBluesky(tweet),
          username,
          replyPost,
          quotePost,
          tweet,
        }

        const dt = await downloadTweet(tweet);
        let hasMedia = false;

        const quoteRecord: Partial<AppBskyEmbedRecord.Main> | undefined = post.quotePost
          ? {
            record: {
              $type: "com.atproto.repo.strongRef",
              cid: post.quotePost.cid,
              uri: post.quotePost.uri,
            },
          }
          : undefined;

        let mediaRecord: Partial<$Typed<AppBskyEmbedRecordWithMedia.Main>> | undefined = undefined;

        const externalRecord = await getExternalEmbedding(richText, agent);

        if (dt.videos.length === 1 && dt.videos[0].blob) {
          log.text = `Uploading video to bluesky...`;
          const [video] = dt.videos;
          try {
            const blob = await parseBlobForBluesky(video.blob!);
            const uploadRes = await agent.uploadBlob(blob.blobData, {
              encoding: blob.mimeType
            })
            mediaRecord = {
              media: {
                $type: "app.bsky.embed.video",
                video: uploadRes.data.blob,
              },
            };
          } catch (e) {
            logError(log, e)`Error while uploading video to bluesky: ${e}`
          }
        } else if (dt.photos.length) {
          const photos = dt.photos
          const photoRes: [ComAtprotoRepoUploadBlob.Response, twitter: Photo][] = []
          for (let i = 0; i < photos.length; i++) {
            if (i >= BLUESKY_MEDIA_IMAGES_MAX_COUNT) {
              log.warn(`${photos.length} photos is too much for bluesky...`)
              break;
            }
            const photo = photos[i]
            if (!photo.blob) {
              log.warn(`can't download ${photos}...`)
              continue;
            }
            try {
              const blob = await parseBlobForBluesky(photo.blob);
              photoRes.push(
                [await agent.uploadBlob(blob.blobData, {
                  encoding: blob.mimeType
                }), photo]
              )
            } catch (e) {
              logError(log, e)`Failed to parse ${photo} for bluesky: ${e}`
            }
          }

          if (photoRes.length) {
            mediaRecord = {
              media: {
                $type: "app.bsky.embed.images",
                images: photoRes.map(([i, p]) => ({
                  alt: p.alt_text ?? "",
                  image: i.data.blob,
                } as BlueskyImage)),
              },
            }
          }
        }

        if (!hasMedia && !post.tweet.text) {
          log.warn(
            `☁️ | post skipped: no compatible media nor text to post (tweet: ${post.tweet.id})`,
          );
          // return false;
          return;
        }

        let firstEmbed: AppBskyFeedPost.Record["embed"] = undefined;
        // Inject media and/or quote data only for the first chunk.
        if (quoteRecord) {
          firstEmbed = {
            ...quoteRecord,
            $type: "app.bsky.embed.record",
          };
        }
        if (mediaRecord) {
          if (!firstEmbed)
            firstEmbed = { $type: "app.bsky.embed.recordWithMedia" }
          firstEmbed = {
            ...firstEmbed,
            ...mediaRecord,
            $type: "app.bsky.embed.recordWithMedia",
          };
        }
        firstEmbed = firstEmbed ? firstEmbed : externalRecord

        const chunkReferences: Array<{
          cid: string;
          rkey: string;
        } & { uri: string }> = [];

        for (let i = 0; i < post.chunks.length; i++) {
          const chunk = post.chunks[i]

          if (DEBUG) {
            console.log("bluesky post chunk: ", chunk);
          }

          const richText = new RichText({ text: chunk });
          await richText.detectFacets(agent);
          const createdAt = new Date(
            (BACKDATE_BLUESKY_POSTS ?
              post.tweet.timestamp : null) || Date.now()).toISOString();
          const data: Partial<AppBskyFeedPost.Record> = {
            $type: "app.bsky.feed.post",
            text: richText.text,
            facets: richText.facets,
            createdAt,
          }

          if (i === 0 && firstEmbed) {
            data.embed = firstEmbed;
          } else {
            data.embed = await getExternalEmbedding(richText, agent);
          }

          if (i === 0) {
            if (post.replyPost) {
              if (post.replyPost.value.reply) {
                data.reply = buildReplyEntry(
                  post.replyPost.value.reply.root,
                  post.replyPost,
                );
              } else {
                data.reply = buildReplyEntry(post.replyPost);
              }
            }
          } else {
            data.reply = buildReplyEntry(
              chunkReferences[0],
              chunkReferences[i - 1],
            );
          }

          log.text = `☁️ | post sending: ${getPostExcerpt(post.tweet.text ?? VOID)}`;


          const createdPost = await agent.post({ ...data })
          oraProgress(
            log,
            { before: "☁️ | post sending: " },
            i,
            post.chunks.length,
          );

          chunkReferences.push({
            cid: createdPost.cid,
            uri: createdPost.uri,
            rkey: RKEY_REGEX.exec(createdPost.uri)?.groups?.["rkey"] ?? "",
          });

        }


        return {
          platformStore: JSON.stringify(
            chunkReferences.map((ref) => ({
              rkey: ref.rkey,
              cid: ref.cid,
            }))
          )
        };
      },
    };
  },
};
