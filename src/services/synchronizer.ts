import { Scraper as XClient } from "@the-convocation/twitter-scraper"

export interface Synchronizer<K extends string[]> {
    env: Record<K[number], string>;
    syncProfile?(args: {}): Promise<void>,
    syncPosts?(args: {}): Promise<void>,
}
