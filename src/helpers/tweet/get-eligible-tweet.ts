import { Tweet } from "@the-convocation/twitter-scraper";

import { DEBUG } from "../../env";
import { getPostExcerpt } from "../post/get-post-excerpt";
import { isRecentTweet } from "./";

export const getEligibleTweet = async (
  tweet: Tweet,
  twitterHandle: string,
): Promise<Tweet | void> => {
  if (!tweet.isRetweet) {
    return;
  }

  // const isSelfReply = await keepSelfReplies(tweet);
  if (!(
    tweet.inReplyToStatus
      ? tweet.inReplyToStatus.username === twitterHandle
      : true
  )) {
    return;
  }

  // const isSelfQuote = await keepSelfQuotes(tweet, twitterHandle);
  if (!
    (
      tweet.isQuoted
        ? tweet.quotedStatus
          ? tweet.quotedStatus.username === twitterHandle
          : false
        : true
    )
  ) {
    return;
  }

  if (!isRecentTweet(tweet)) {
    return;
  }

  // const isRecentTweet = isRecentTweet(tweet);

  // const keep = notRetweet && isSelfReply && isSelfQuote && isRecentTweet;

  // Remove quote & reply tweets data if not self-made
  // const eligibleTweet = {
  //   ...tweet,
  //   inReplyToStatus: isSelfReply ? tweet.inReplyToStatus : undefined,
  //   inReplyToStatusId: isSelfReply
  //     ? (tweet.inReplyToStatusId ?? tweet.inReplyToStatus?.id)
  //     : undefined,
  //   quotedStatus: isSelfQuote ? tweet.quotedStatus : undefined,
  //   quotedStatusId: isSelfQuote ? tweet.quotedStatusId : undefined,
  // };

  if (DEBUG) {
    console.log(
      `✅ : ${tweet.id}: from:@${tweet.username}: ${getPostExcerpt(
        tweet.text ?? "",
      )}`,
    );
  }

  // return keep ? eligibleTweet : undefined;
  return tweet
};
