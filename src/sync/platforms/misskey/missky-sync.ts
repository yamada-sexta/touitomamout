import { SynchronizerFactory } from "sync/synchronizer"
import z from "zod";
import * as Misskey from 'misskey-js';
import { DEBUG } from "env";
import { handleRateLimit } from "./rate-limit";

const KEYS = ["MISSKEY_INSTANCE", "MISSKEY_ACCESS_CODE"];
const MisskeyStoreSchema = z.object({})

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


        return ({
            async syncBio(args) {
                await runWithRateLimitRetry(() => api.request("i/update", {
                    description: args.formattedBio
                }));
            },
            async syncBanner(args) {
                await runWithRateLimitRetry(async () => {
                    if (DEBUG) console.log("Updating banner for Misskey");

                    const res = await api.request("drive/files/create", {
                        file: new File([args.bannerBlob], "banner")
                    });
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
                        file: new File([args.pfpBlob], "pfp")
                    });

                    if (DEBUG)
                        console.log(res);

                    await api.request("i/update", { avatarId: res.id });
                });
            }
        })
    }
}