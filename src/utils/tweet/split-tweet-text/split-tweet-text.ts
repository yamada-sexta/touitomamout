import { Tweet } from "@the-convocation/twitter-scraper";

import {
  BLUESKY_MAX_POST_LENGTH,
  MASTODON_MAX_POST_LENGTH,
} from "env";
import { Platform } from "types";
import { buildChunksFromSplitterEntries } from "./build-chunks-from-splitter-entries";
import { extractWordsAndSpacers } from "./extract-words-and-spacers";
import { getMastodonQuoteLinkSection } from "./get-mastodon-quote-link-section";


/**
 * Shared core function that splits text into chunks.
 */
async function splitTweetTextCore(
  text: string,
  urls: string[],
  platform: Platform,
  quotedStatusId: string | undefined,
  maxChunkSize: number,
  quotedStatusLinkSection: string
): Promise<string[]> {
  const entries = extractWordsAndSpacers(text, urls);
  return buildChunksFromSplitterEntries(
    entries,
    platform,
    quotedStatusId,
    maxChunkSize,
    quotedStatusLinkSection
  );
}
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



// export const splitTextForMastodon = (tweet: Tweet, mastodonUsername: string) =>
//   splitTweetText(tweet, Platform.MASTODON, mastodonUsername);

// export const splitTextForBluesky = (tweet: Tweet) =>
//   splitTweetText(tweet, Platform.BLUESKY);
