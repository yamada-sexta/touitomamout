import { Tweet } from "@the-convocation/twitter-scraper";
import { BLUESKY_MAX_POST_LENGTH } from "env";
import { splitTweetTextCore } from "utils/tweet/split-tweet-text";

/**
 * Bluesky-specific split logic.
 */
export async function splitTextForBluesky(
  tweet: Tweet
): Promise<string[]> {

  const { text, quotedStatusId, urls } = tweet;
  if (!text) {
    return []
  }
  const maxChunkSize = BLUESKY_MAX_POST_LENGTH;

  if (text!.length <= maxChunkSize) {
    return [text!];
  }

  return await splitTweetTextCore({
    text, urls, quotedStatusId, appendQuoteLink: false,
    maxChunkSize, quotedStatusLinkSection: ""
  }
  );
}

