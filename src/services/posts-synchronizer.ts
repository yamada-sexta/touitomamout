// import { AtpAgent } from "@atproto/api";
// import * as Counter from "@pm2/io/build/main/utils/metrics/counter";
// import { Scraper } from "@the-convocation/twitter-scraper";
// import { mastodon } from "masto";
// import ora from "ora";

// import { SYNC_DRY_RUN } from "../env";
// import { getCachedPosts } from "../helpers/cache/get-cached-posts";
// import { oraPrefixer } from "../helpers/logs";
// import { makePost } from "../helpers/post/make-post";
// import { Media, Metrics } from "../types";
// // import { blueskySenderService } from "./bluesky-sender";
// // import { mastodonSenderService } from "./mastodon-sender";
// import { tweetsGetterService } from "./tweets-getter";
// // import { downloadMedia } from "helpers/download-media";

// /**
//  * An async method in charge of dispatching posts synchronization tasks for each received tweets.
//  */
// export const postsSynchronizerService = async (
//   twitterClient: Scraper,
//   mastodonClient: mastodon.rest.Client | null,
//   blueskyClient: AtpAgent | null,
//   synchronizedPostsCountThisRun: Counter.default,
// ): Promise<{ metrics: Metrics }> => {
//   const tweets = await tweetsGetterService(twitterClient);

//   try {
//     let tweetIndex = 0;
//     for (const tweet of tweets) {
//       tweetIndex++;
//       const log = ora({
//         color: "cyan",
//         prefixText: oraPrefixer("content-sync"),
//       }).start();

//       // const mediaPromises: Promise<Media>[] = 

//       const medias = await Promise.all<Media>(
//         [
//           ...tweet.photos
//             .map(
//               async photo => {
//                 return {
//                   type: "image", photo: photo, blob: await downloadMedia(photo.url)
//                 } as Media
//               }
//             ),
//           ...tweet.videos
//             .filter(video => !!video.url)
//             .map(
//               async video => {
//                 return {
//                   type: "video", video, blob: await downloadMedia(video.url!)
//                 } as Media
//               }
//             )
//         ]
//       )

//       const { mastodon: mastodonPost, bluesky: blueskyPost } = await makePost(
//         tweet,
//         mastodonClient,
//         blueskyClient,
//         log,
//         { current: tweetIndex, total: tweets.length },
//       );

//       if (!SYNC_DRY_RUN) {
//         await mastodonSenderService(mastodonClient, mastodonPost, medias, log);
//         await blueskySenderService(blueskyClient, blueskyPost, medias, log);
//       }
//       if (mastodonClient || blueskyPost) {
//         synchronizedPostsCountThisRun.inc();
//       }

//       log.stop();
//     }

//     return {
//       metrics: {
//         totalSynced: Object.keys(await getCachedPosts()).length,
//         justSynced: tweets.length,
//       },
//     };
//   } catch (err) {
//     console.error(err);

//     return {
//       metrics: {
//         totalSynced: Object.keys(await getCachedPosts()).length,
//         justSynced: 0,
//       },
//     };
//   }
// };
