// import { Scraper } from "@the-convocation/twitter-scraper";
// import * as Counter from "@pm2/io/build/main/utils/metrics/counter";
// import { PostSynchronizer } from "./post-sender";
// import { getTweets as getTweets } from "services/tweets-getter";
// import ora from "ora";
// import { oraPrefixer } from "utils/logs/ora-prefixer";
// import { getTweetMedia } from "./get-tweet-media";
// import { logError } from "utils/logs/log-error";

// export type SyncPostMetrics = {
//     totalSynced: number;
//     justSynced: number;
// };


// export async function syncPosts(args: {
//     twitterClient: Scraper,
//     synchronizers: PostSynchronizer[],
//     syncCount: Counter.default,
//     twitterHandle: string,
// }): Promise<{ metrics: SyncPostMetrics }> {
//     try {
//         const { twitterClient, synchronizers, syncCount } = args;
//         const tweets = await getTweets({ twitterClient, twitterHandle: args.twitterHandle });
//         for (let i = 0; i < tweets.length; i++) {
//             const log = ora({
//                 color: "cyan",
//                 prefixText: oraPrefixer("content-sync"),
//             }).start();
//             const tweet = tweets[i];

//             try {
//                 const mediaList = await getTweetMedia(tweet);
//                 // for (const media of mediaList){
//                 //     console.log("media type", media.blob.type)
//                 // }
//                 await Promise.all<void>(
//                     synchronizers.map(
//                         s => s.syncPost({
//                             tweet, mediaList, log
//                         })
//                     )
//                 )
//                 syncCount.inc();
//                 log.stop();
//             }
//             catch (error) {
//                 logError(log, error)`Error during synchronization post [${i}]: ${error}`
//             }
//         }
//         return {
//             metrics: {
//                 totalSynced: Object.keys(await getCachedPosts()).length,
//                 justSynced: tweets.length,
//             },
//         };
//     } catch (error) {
//         const msg = (error instanceof Error) ? error.message : String(error)
//         console.warn(`Error during synchronization posts: ${msg}`)
//         return {
//             metrics: {
//                 totalSynced: Object.keys(await getCachedPosts()).length,
//                 justSynced: 0,
//             },
//         };
//     }
// }