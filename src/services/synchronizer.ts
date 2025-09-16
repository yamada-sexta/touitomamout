import { Scraper as XClient } from "@the-convocation/twitter-scraper"
import { Ora } from "ora";

export interface Synchronizer<K extends readonly string[]> {
    name: string,
    create(
        args: {
            xClient: XClient,
            env: Record<K[number], string>;
        }
    ): Promise<this | void>,
    // env?: Record<K[number], string>;
    ENV_KEYS: K,
    syncProfile?(args: { log: Ora }): Promise<void>,
    syncPosts?(args: { log: Ora }): Promise<void>,
}
