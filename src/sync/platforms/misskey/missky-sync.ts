import { Scraper } from "@the-convocation/twitter-scraper";
import { DBType } from "db";
import { Ora } from "ora";
import { SynchronizerBase, SynchronizerFactory } from "sync/synchronizer"
import z from "zod";
import * as Misskey from 'misskey-js';
import { DEBUG } from "env";

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

        // const client = new Misskey.



        // throw new Error("Function not implemented.");
        return ({
            async syncBio(args) {
                await api.request("i/update", {
                    description: args.formattedBio
                })
            },
            async syncBanner(args) {
                const res = await api.request("drive/files/create", {
                    file: args.bannerBlob
                })
                if (DEBUG)
                    console.log(res)
                await api.request("i/update", {
                    bannerId: res.id
                })
            }
        })
    }
}