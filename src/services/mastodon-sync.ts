import { Synchronizer } from "./synchronizer";

const MASTODON_ENV_KEYS = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'DATABASE_URL'
] as const;


export class MastodonSynchronizer implements Synchronizer<typeof MASTODON_ENV_KEYS> {

}