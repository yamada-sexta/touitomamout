// import { Tweet } from "@the-convocation/twitter-scraper";
// import { getPostExcerpt } from "../post/get-post-excerpt";
// import { isRecentTweet } from ".";

// export const getEligibleTweet = async (
//   tweet: Tweet,
//   twitterHandle: string,
// ): Promise<Tweet | void> => {
//   // Don't post retweet
//   if (tweet.isRetweet) {
//     // console.log("Is retweet");
//     return;
//   }

//   // const isSelfReply = await keepSelfReplies(tweet);
//   if (!(
//     tweet.inReplyToStatus
//       ? tweet.inReplyToStatus.username === twitterHandle
//       : true
//   )) {
//     return;
//   }

//   // const isSelfQuote = await keepSelfQuotes(tweet, twitterHandle);
//   if (!
//     (
//       tweet.isQuoted
//         ? tweet.quotedStatus
//           ? tweet.quotedStatus.username === twitterHandle
//           : false
//         : true
//     )
//   ) {
//     // console.log("Isn't self quote");

//     return;
//   }

//   if (!isRecentTweet(tweet)) {
//     return;
//   }

//   // if (DEBUG) {
//   console.log(
//     `✅ : ${tweet.id}: from:@${tweet.username}: ${getPostExcerpt(
//       tweet.text ?? "",
//     )}`,
//   );
//   // }

//   // return keep ? eligibleTweet : undefined;
//   return tweet
// };
