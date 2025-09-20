import { SynchronizerFactory } from "sync/synchronizer"
import z from "zod";
import { DEBUG } from "env";
import { downloadTweet } from "utils/tweet/download-tweet";
import { APIEmbed } from "discord-api-types/payloads";
import { RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/rest/v10";

const KEYS = ["WEBHOOK_URL"];
const WebhookStoreSchema = z.object({
    id: z.string()
})

function formatForDiscord(tweet: Awaited<ReturnType<typeof downloadTweet>>): {
    content?: string;
    embeds: APIEmbed[];
} {
    const embeds: APIEmbed[] = [];

    const baseEmbed: APIEmbed = {
        author: {
            name: `${tweet.name} @${tweet.username}`,
            url: `https://x.com/${tweet.username}`,

        },
        description: tweet.text,
        url: `https://x.com/${tweet.username}/status/${tweet.id}`,
        footer: {
            text: `𝕏 • ${new Date(tweet.timestamp || Date.now()).toLocaleString()}`,
        },
    };

    // Attach first image or video preview
    if (tweet.photos.length > 0) {
        baseEmbed.image = { url: tweet.photos[0].url };
    } else if (tweet.videos.length > 0 && tweet.videos[0].url) {
        baseEmbed.video = { url: tweet.videos[0].url };
    }

    embeds.push(baseEmbed);

    // Additional photos → separate embeds (Discord shows only one image per embed)
    if (tweet.photos.length > 1) {
        for (const photo of tweet.photos.slice(1)) {
            embeds.push({ image: { url: photo.url } });
        }
    }

    return {
        content: undefined, // optionally add mentions here
        embeds,
    };
}

export const WebhookSynchronizerFactory: SynchronizerFactory<typeof KEYS, typeof WebhookStoreSchema> = {
    EMOJI: "🔗",
    DISPLAY_NAME: "Webhook",
    PLATFORM_ID: "webhook",
    ENV_KEYS: KEYS,
    STORE_SCHEMA: WebhookStoreSchema,
    async create(args) {
        const webhookUrl = args.env.WEBHOOK_URL;
        async function sendWebhook(payload: any) {
            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
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
                // const dt = await downloadTweet(args.tweet);
                const payload = formatForDiscord(args.tweet);

                if (DEBUG) console.log("Sending webhook payload:", { payload });

                await sendWebhook({ ...payload, text: args.tweet.text ?? "" });

                return {
                    store: {
                        id: args.tweet.id
                    }
                };
            }
        });
    }
};
