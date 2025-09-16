import { Scraper } from "@the-convocation/twitter-scraper";
import { DBType, Schema } from "db";
import { eq, sql } from "drizzle-orm";
import { oraPrefixer } from "helpers/logs";
import ora, { Ora } from "ora";

export async function createXClient({
    twitterPassword, twitterUsername, db
}: {
    twitterUsername?: string,
    twitterPassword?: string,
    db: DBType
}): Promise<Scraper> {
    const log = ora({
        color: "gray",
        prefixText: oraPrefixer("Creating 𝕏 client"),
    }).start("connecting to twitter...");

    const client = new Scraper();
    if (!twitterPassword || !twitterUsername) {
        log.warn("connected as guest | replies will not be synced");
        return client;
    }
    
    const cookieStr = await (await db.query.TwitterCookieCache.findFirst({
        where: eq(Schema.TwitterCookieCache.userHandle, twitterUsername)
    }))?.cookie;


    await handleTwitterAuth(twitterClient);

    return client;
}