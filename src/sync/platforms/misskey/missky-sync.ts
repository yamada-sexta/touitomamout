import { SynchronizerFactory } from "sync/synchronizer"
import z from "zod";
import * as Misskey from 'misskey-js';
import { DEBUG } from "env";
import { handleRateLimit } from "./rate-limit";
// import { downloadTweet } from "utils/tweet/download-tweet";

const KEYS = ["MISSKEY_INSTANCE", "MISSKEY_ACCESS_CODE"];
const MisskeyStoreSchema = z.object({
    id: z.string()
})

export const MisskeySynchronizerFactory: SynchronizerFactory<typeof KEYS, typeof MisskeyStoreSchema> = {
    EMOJI: "Ⓜ️",
    DISPLAY_NAME: "Misskey",
    PLATFORM_ID: "misskey",
    "ENV_KEYS": KEYS,
    STORE_SCHEMA: MisskeyStoreSchema,
    async create(args) {

        const api = new Misskey.api.APIClient({
            origin: `https://${args.env.MISSKEY_INSTANCE}`,
            credential: args.env.MISSKEY_ACCESS_CODE,
        });

        async function runWithRateLimitRetry<T = unknown>(task: () => Promise<T>): Promise<T> {
            try {
                return await task();
            } catch (err) {
                if (await handleRateLimit(err)) {
                    return await task();
                }
                throw err;
            }
        }

        const uploadMedia = async (file: File) => {
            return await runWithRateLimitRetry(
                async () => {
                    return await api.request("drive/files/create", {
                        file: file
                    });
                }
            )
        }


        return ({
            async syncBio(args) {
                await runWithRateLimitRetry(() => api.request("i/update", {
                    description: args.formattedBio
                }));
            },
            async syncBanner(args) {
                await runWithRateLimitRetry(async () => {
                    if (DEBUG) console.log("Updating banner for Misskey");
                    const res = await uploadMedia(args.bannerFile)
                    if (DEBUG) console.log(res);
                    await api.request("i/update", { bannerId: res.id });
                });
            },
            async syncUserName(args) {
                await runWithRateLimitRetry(() => api.request("i/update", {
                    name: args.name
                }));
            },
            async syncProfilePic(args) {
                await runWithRateLimitRetry(async () => {
                    const res = await api.request("drive/files/create", {
                        file: new File([args.pfpFile], "pfp")
                    });

                    if (DEBUG)
                        console.log(res);

                    await api.request("i/update", { avatarId: res.id });
                });
            },
            async syncPost(args) {
                if (args.store.success) {
                    args.log.info("skipping...");
                    return {
                        store: args.store.data,
                    };
                }

                return await runWithRateLimitRetry(async () => {
                    const mediaIds: string[] = []
                    const t = args.tweet;
                    // const dt = await downloadTweet(args.tweet);
                    (await t.photoFiles()).forEach(async p =>
                        p.file ?
                            mediaIds.push(
                                (await uploadMedia(p.file)).id
                            ) : undefined);

                    (await t.videoFiles()).forEach(async v => v.file ?
                        mediaIds.push(((await uploadMedia(v.file)).id)) : undefined)
                    const res = await api.request("notes/create", {
                        text: args.tweet.text,
                        mediaIds: mediaIds.length ? mediaIds : undefined,
                    });
                    if (DEBUG) console.log(res)
                    return {
                        store: {
                            id: res.createdNote.id
                        }
                    }
                })
            }
        })
    }
}