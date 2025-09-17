import { Tweet } from "@the-convocation/twitter-scraper";
import { BLUESKY_MAX_POST_LENGTH } from "env";

/**
 * Bluesky-specific split logic.
 */
export async function splitTextForBluesky(
  tweet: Tweet
): Promise<string[]> {
  const { text, quotedStatusId, urls } = tweet;
  const maxChunkSize = BLUESKY_MAX_POST_LENGTH;

  if (text!.length <= maxChunkSize) {
    return [text!];
  }

  return splitTweetTextCore(
    text!,
    urls,
    Platform.BLUESKY,
    quotedStatusId,
    maxChunkSize,
    "" // Bluesky doesn’t need a quoted link section
  );
}

