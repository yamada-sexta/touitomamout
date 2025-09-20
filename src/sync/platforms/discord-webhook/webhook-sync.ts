import { SynchronizerFactory } from "sync/synchronizer"
import z from "zod";
import { DEBUG } from "env";
import { downloadTweet } from "utils/tweet/download-tweet";
import { APIEmbed } from "discord-api-types/payloads";
import { RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/v10";
import { Tweet } from "@the-convocation/twitter-scraper";

const KEYS = ["DISCORD_WEBHOOK_URL"] as const;

const WebhookStoreSchema = z.object({
    id: z.string()
})

function formatForDiscord(tweet: Tweet): { content?: string; embeds: APIEmbed[] } {
    const embeds: APIEmbed[] = [];

    // const cleanedText = (tweet.text ?? "").replace(/https:\/\/t\.co\/\S+/g, "").trim();
    const cleanedText = tweet.text ?? ""

    const baseEmbed: APIEmbed = {
        color: 0x1DA1F2,
        author: {
            name: `${tweet.name} (@${tweet.username})`,
            url: `https://x.com/${tweet.username}`,
            // icon_url: tweet.avatarUrl, // if available in your fetcher
        },
        description: tweet.sensitiveContent
            ? `⚠️ **Sensitive Content**\n\n${cleanedText}`
            : cleanedText,
        url: tweet.permanentUrl ?? `https://x.com/${tweet.username}/status/${tweet.id}`,
        footer: {
            text: `❤️ ${tweet.likes ?? 0}   🔁 ${tweet.retweets ?? 0}   💬 ${tweet.replies ?? 0}   👀 ${tweet.views ?? 0} • ${new Date(tweet.timestamp || Date.now()).toLocaleString()}`
        },
    };

    // Media
    if (tweet.photos.length > 0) {
        baseEmbed.image = { url: tweet.photos[0].url };
    }

    embeds.push(baseEmbed);

    // Extra photos
    if (tweet.photos.length > 1) {
        for (const photo of tweet.photos.slice(1)) {
            embeds.push({ image: { url: photo.url }, color: 0x1DA1F2 });
        }
    }

    // Videos
    if (tweet.videos.length > 0) {
        for (const video of tweet.videos) {
            embeds.push({
                url: video.url,
                description: `🎥 [Watch Video](${video.url})`,
                color: 0x1DA1F2,
            });
        }
    }

    // Quoted tweet
    if (tweet.quotedStatus) {
        embeds.push({
            color: 0x8899A6,
            author: {
                name: `${tweet.quotedStatus.name} (@${tweet.quotedStatus.username})`,
                url: `https://x.com/${tweet.quotedStatus.username}`,
            },
            description: tweet.quotedStatus.text ?? "",
            url: tweet.quotedStatus.permanentUrl,
        });
    }

    // Retweet
    if (tweet.retweetedStatus) {
        embeds.unshift({
            description: `🔁 Retweeted [@${tweet.retweetedStatus.username}](https://x.com/${tweet.retweetedStatus.username}/status/${tweet.retweetedStatus.id})`,
            color: 0x8899A6,
        });
    }

    // Thread preview
    if (tweet.thread?.length > 1) {
        const threadPreview = tweet.thread
            .slice(1, 3)
            .map(t => `↳ ${t.text?.slice(0, 100)}${t.text && t.text.length > 100 ? "…" : ""}`)
            .join("\n");
        baseEmbed.fields ??= [];
        baseEmbed.fields.push({
            name: "Thread",
            value: threadPreview + (tweet.thread.length > 3 ? "\n…more" : "")
        });
    }

    // Hashtags & mentions
    if (tweet.hashtags.length > 0 || tweet.mentions.length > 0) {
        baseEmbed.fields ??= [];
        baseEmbed.fields.push({
            name: "Tags",
            value: [
                tweet.hashtags.length > 0 ? "🏷 " + tweet.hashtags.map(h => `#${h}`).join(" ") : null,
                tweet.mentions.length > 0 ? "👤 " + tweet.mentions.map(m => `@${m.username}`).join(" ") : null
            ].filter(Boolean).join("\n")
        });
    }

    // Location
    if (tweet.place) {
        baseEmbed.fields ??= [];
        baseEmbed.fields.push({
            name: "📍 Location",
            value: tweet.place.full_name ?? tweet.place.name ?? ""
        });
    }

    return { embeds };
}


export const DiscordWebhookSynchronizerFactory: SynchronizerFactory<typeof KEYS, typeof WebhookStoreSchema> = {
    EMOJI: "🔗",
    DISPLAY_NAME: "Webhook (Discord)",
    PLATFORM_ID: "webhook-discord",
    ENV_KEYS: KEYS,
    STORE_SCHEMA: WebhookStoreSchema,
    async create(args) {
        const webhookUrl = args.env["DISCORD_WEBHOOK_URL"]
        async function sendWebhook(payload: RESTPostAPIWebhookWithTokenJSONBody) {
            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.status === 429) {
                const data = await res.json().catch(() => ({}));
                const retryAfter = data.retry_after ? Number(data.retry_after) * 1000 : 1000; // fallback 1s
                args?.log?.warn?.(`Rate limited by Discord. Retrying after ${retryAfter}ms...`);

                await new Promise(resolve => setTimeout(resolve, retryAfter));
                return sendWebhook(payload); // retry
            }

            if (!res.ok) {
                throw new Error(`Webhook failed with status ${res.status}: ${await res.text()}`);
            }
            return res;
        }
        return ({
            async syncPost(args) {
                if (args.store.success) {
                    args.log.info("skipping...");
                    return { store: args.store.data };
                }
                const payload = formatForDiscord(args.tweet);

                if (DEBUG) console.log("Sending webhook payload:", { payload });

                await sendWebhook(payload);

                return {
                    store: {
                        id: args.tweet.id
                    }
                };
            }
        });
    }
};
