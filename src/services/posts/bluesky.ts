import { PostSynchronizer } from "./post-sender";
import { Tweet } from "@the-convocation/twitter-scraper";
import { Ora } from "ora";
import { BlueskyCacheChunk, BlueskyMediaAttachment, Media, Platform } from "types";
import AtpAgent, { AppBskyFeedPost, RichText } from "@atproto/api";
import { makeBlueskyPost } from "helpers/post/make-bluesky-post";
import { parseBlobForBluesky } from "helpers/medias/parse-blob-for-bluesky";
import { BACKDATE_BLUESKY_POSTS, DEBUG, VOID } from "env";
import { createMediaRecord } from "helpers/bluesky/create-media-record";
import { buildReplyEntry, getBlueskyChunkLinkMetadata } from "helpers/bluesky";
import { getPostExcerpt } from "helpers/post/get-post-excerpt";
import { oraProgress } from "helpers/logs";
import { savePostToCache } from "helpers/cache/save-post-to-cache";

const BLUESKY_MEDIA_IMAGES_MAX_COUNT = 4;
const RKEY_REGEX = /\/(?<rkey>\w+)$/;

export class BlueskyPostSynchronizer implements PostSynchronizer {
    constructor(private client: AtpAgent) { }
    async syncPost(args: { tweet: Tweet; mediaList: Media[]; log: Ora; }): Promise<void> {
        const { tweet, mediaList, log } = args;
        const post = await makeBlueskyPost(this.client, args.tweet)

        const mediaAttachments: BlueskyMediaAttachment[] = [];
        for (const media of mediaList) {
            if (!(
                (media.type === "image" &&
                    mediaAttachments.length < BLUESKY_MEDIA_IMAGES_MAX_COUNT) ||
                (media.type === "video" && mediaAttachments.length === 0)
            )) {
                log.info("Unable to upload all media...")
                break;
            }

            log.text = `media: ↑ (${mediaAttachments.length + 1}/${mediaList.length}) uploading`;

            const blueskyBlob = await parseBlobForBluesky(media.blob);
            const res = await this.client
                .uploadBlob(blueskyBlob.blobData, { encoding: blueskyBlob.mimeType })
            mediaAttachments.push(
                {
                    ...res,
                    alt_text: (media.type === "image" && media.photo.alt_text) ? media.photo.alt_text : undefined
                } as BlueskyMediaAttachment
            )
        }

        if (!mediaAttachments.length && !post.tweet.text) {
            log.warn(
                `☁️ | post skipped: no compatible media nor text to post (tweet: ${post.tweet.id})`,
            );
            // return false;
            return;
        }

        // let chunkIndex = 0;
        const chunkReferences: Array<BlueskyCacheChunk & { uri: string }> = [];
        for (let i = 0; i < post.chunks.length; i++) {
            const chunk = post.chunks[i]

            if (DEBUG) {
                console.log("bluesky post chunk: ", chunk);
            }


            const richText = new RichText({ text: chunk });
            await richText.detectFacets(this.client);


            const createdAt = new Date(
                (BACKDATE_BLUESKY_POSTS ?
                    post.tweet.timestamp : null) || Date.now()).toISOString()
            const data: Partial<AppBskyFeedPost.Record> = {
                $type: "app.bsky.feed.post",
                text: richText.text,
                facets: richText.facets,
                createdAt,
            }

            /**
            * First, compute the embed data.
            * It can be: quote, media, quote + media, or link card.
            */

            const quoteRecord = post.quotePost
                ? {
                    record: {
                        $type: "app.bsky.embed.record",
                        cid: post.quotePost.cid,
                        uri: post.quotePost.uri,
                    },
                }
                : {};

            const mediaType = mediaList[0]?.type;
            const mediaRecord = createMediaRecord(mediaType, mediaAttachments);


            const card = await getBlueskyChunkLinkMetadata(richText, this.client);

            const externalRecord = card
                ? {
                    external: {
                        uri: card.url,
                        title: card.title,
                        description: card.description,
                        thumb: card.image?.data.blob.original,
                        $type: "app.bsky.embed.external",
                    },
                }
                : {};


            /**
             * Then, build the embed object.
             */
            let embed = {
                $type: "N/A"
            };

            // Inject media and/or quote data only for the first chunk.
            if (i === 0) {
                // Handle quote
                if (Object.keys(quoteRecord).length) {
                    embed = {
                        ...quoteRecord,
                        $type: "app.bsky.embed.record",
                    };
                    // ...with media(s)
                    if (Object.keys(mediaRecord).length) {
                        embed = {
                            ...embed,
                            ...mediaRecord,
                            $type: "app.bsky.embed.recordWithMedia",
                        };
                    }
                } else if (Object.keys(mediaRecord).length) {
                    // Handle media(s) only
                    embed = {
                        $type: "app.bsky.embed.recordWithMedia",
                        ...mediaRecord.media,
                    };
                }
            }

            // Handle link card if no quote nor media
            if (!Object.keys(quoteRecord).length && !Object.keys(mediaRecord).length) {
                if (Object.keys(externalRecord).length) {
                    embed = {
                        ...embed,
                        ...externalRecord,
                        $type: "app.bsky.embed.external",
                    };
                }
            }

            // Inject embed data.
            if (Object.keys(embed).length) {
                data.embed = embed;
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


            const createdPost = await this.client.post({ ...data })
            oraProgress(
                log,
                { before: "☁️ | post sending: " },
                i,
                post.chunks.length,
            );

            // Save post ID to be able to reference it while posting the next chunk.

            chunkReferences.push({
                cid: createdPost.cid,
                uri: createdPost.uri,
                rkey: RKEY_REGEX.exec(createdPost.uri)?.groups?.["rkey"] ?? "",
            });


            // If this is the last chunk, save the all chunks ID to the cache.
            if (i === post.chunks.length - 1) {
                log.succeed(
                    `☁️ | post sent: ${getPostExcerpt(post.tweet.text ?? VOID)}${chunkReferences.length > 1
                        ? ` (${chunkReferences.length} chunks)`
                        : ""
                    }`,
                );

                await savePostToCache({
                    tweetId: post.tweet.id,
                    data: chunkReferences.map((ref) => ({
                        rkey: ref.rkey,
                        cid: ref.cid,
                    })),
                    platform: Platform.BLUESKY,
                });
            }
        }
    }
}