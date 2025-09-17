import { Scraper, Tweet } from "@the-convocation/twitter-scraper";
import ora from "ora";

import { API_RATE_LIMIT } from "../env";
import { getCachedPosts } from "../utils/cache/get-cached-posts";
import { oraPrefixer, oraProgress } from "../utils/logs";
import { isTweetCached, tweetFormatter } from "../utils/tweet";
import { getEligibleTweet } from "../utils/tweet/get-eligible-tweet";

const pullContentStats = (tweets: Tweet[], title: string) => {
  const stats = {
    total: tweets.length,
    retweets: tweets.filter((t) => t.isRetweet).length,
    replies: tweets.filter((t) => t.isReply).length,
    quotes: tweets.filter((t) => t.isQuoted).length,
  };

  return (
    `${title}:` +
    Object.entries(stats).reduce(
      (s, [name, value]) => `${s} ${name}: ${value}`,
      "",
    )
  );
};

export async function getTweets(
  args: {
    twitterClient: Scraper,
    twitterHandle: string,
  }
): Promise<Tweet[]> {
  const cachedPosts = await getCachedPosts();
  const log = ora({
    color: "cyan",
    prefixText: oraPrefixer("content-mapper"),
  }).start();
  log.text = "filtering";

  let preventPostsSynchronization = false;
  const LATEST_TWEETS_COUNT = 5;

  /**
   * Synchronization optimization: prevent excessive API calls & potential rate-limiting
   *
   * Pull the ${LATEST_TWEETS_COUNT}, filter eligible ones.
   * This optimization prevents the post sync if the latest eligible tweet is cached.
   */
  const latestTweets = args.twitterClient.getTweets(
    args.twitterHandle,
    LATEST_TWEETS_COUNT,
  );

  for await (const latestTweet of latestTweets) {
    log.text = "post: → checking for synchronization needs";
    if (!preventPostsSynchronization) {
      // Only consider eligible tweets.
      const tweet = await getEligibleTweet(tweetFormatter(latestTweet), args.twitterHandle);

      if (tweet) {
        // If the latest eligible tweet is cached, mark sync as unneeded.
        if (isTweetCached(tweet, cachedPosts)) {
          preventPostsSynchronization = true;
        }
        // If the latest tweet is not cached,
        // skip the current optimization and go to synchronization step.
        break;
      }
    }
  }

  // Get tweets from API
  const tweets: Tweet[] = [];

  if (preventPostsSynchronization) {
    log.succeed("task finished (unneeded sync)");
  } else {
    const tweetsIds = args.twitterClient.getTweets(args.twitterHandle, 200);

    let hasRateLimitReached = false;
    let tweetIndex = 0;
    for await (const tweet of tweetsIds) {
      tweetIndex++;
      oraProgress(log, { before: "post: → filtering" }, tweetIndex, 200);

      const rateLimitTimeout = setTimeout(
        () => (hasRateLimitReached = true),
        1000 * API_RATE_LIMIT,
      );

      if (hasRateLimitReached || isTweetCached(tweet, cachedPosts)) {
        continue;
      }

      const t: Tweet = tweetFormatter(tweet);

      const eligibleTweet = await getEligibleTweet(t, args.twitterHandle);
      if (eligibleTweet) {
        tweets.unshift(eligibleTweet);
      }
      clearTimeout(rateLimitTimeout);
    }

    if (hasRateLimitReached) {
      log.warn(
        `rate limit reached, more than ${API_RATE_LIMIT}s to fetch a single tweet`,
      );
    }

    log.succeed(pullContentStats(tweets, "tweets"));
    log.succeed("task finished");
  }

  return tweets;
};
