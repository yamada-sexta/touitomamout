import { Tweet } from "@the-convocation/twitter-scraper";
import { Ora } from "ora";
import { MastodonCacheChunk, Media, Platform } from "types";
import { PostSynchronizer } from "./post-sender";
import { mastodon } from "masto";
import { makeMastodonPost } from "utils/post/make-mastodon-post";
import { getPostExcerpt } from "utils/post/get-post-excerpt";
import { DEBUG, TwitterHandle, VOID } from "env";
import { oraProgress } from "utils/logs";
import { savePostToCache } from "helpers/cache/save-post-to-cache";
import { getCachePath } from "configuration/configuration";

export class MastodonPostSynchronizer implements PostSynchronizer {
    constructor(private client: mastodon.rest.Client, private twitterHandle: TwitterHandle) { }

    async syncPost(args: { tweet: Tweet; mediaList: Media[]; log: Ora; }): Promise<void> {
        const { tweet, mediaList, log } = args;
        const post = await makeMastodonPost(this.client, tweet)

        const mediaAttachments: mastodon.v1.MediaAttachment[] = [];

        for (const media of mediaList) {
            log.text = `medias: ↑ (${mediaAttachments.length + 1}/${mediaList.length}) uploading`;
            await this.client.v2.media.create(
                {
                    file: media.blob,
                    description: (media.type === "image" && media.photo.alt_text) ?
                        media.photo.alt_text : undefined
                }
            )
        }

        // When no compatible media has been found and no text is present, skip the post.
        if (!mediaAttachments.length && !post.tweet.text) {
            log.warn(
                `🦣️ | post skipped: no compatible media nor text to post (tweet: ${post.tweet.id})`,
            );
            return;
        }

        log.text = `🦣 | toot sending: ${getPostExcerpt(post.tweet.text ?? VOID)}`;

        const chunkReferences: MastodonCacheChunk[] = [];

        /**
         * For each chunk, create and send a toot.
         * If this is the first chunk, we attach medias to the toot if any.
         * If the tweet is a reply, we reference it.
         * If the tweet is long, each child chunk will reference the previous one as replyId.
         */
        for (let i = 0; i < post.chunks.length; i++) {
            const chunk = post.chunks[i]
            if (DEBUG) {
                console.log("mastodon post chunk: ", chunk);
            }

            const toot = await this.client.v1.statuses.create(
                {
                    status: chunk,
                    visibility: "public",
                    // mediaIds: i === 0 ? mediaAttachments.map((m) => m.id) : [],
                    mediaIds: i ? [] : mediaAttachments.map((m) => m.id),
                    inReplyToId: i ? chunkReferences[i - 1] : post.inReplyToId
                    // i === 0 ? post.inReplyToId : chunkReferences[chunkIndex - 1],
                }
            )

            oraProgress(
                log,
                { before: "🦣 | toot sending: " },
                i,
                post.chunks.length,
            );

            // Save toot ID to be able to reference it while posting the next chunk.
            chunkReferences.push(toot.id);
            // If this is the last chunk, save the all chunks ID to the cache.
            if (i === post.chunks.length - 1) {
                log.succeed(
                    `🦣 | toot sent: ${getPostExcerpt(post.tweet.text ?? VOID)}${chunkReferences.length > 1
                        ? ` (${chunkReferences.length} chunks)`
                        : ""
                    }`,
                );

                await savePostToCache({
                    tweetId: post.tweet.id,
                    data: chunkReferences,
                    platform: Platform.MASTODON,
                    cachePath: getCachePath(this.twitterHandle)
                });
            }
        }
    }
}