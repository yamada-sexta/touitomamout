import { Tweet } from "@the-convocation/twitter-scraper";
import { MASTODON_MAX_POST_LENGTH } from "env";
import { getMastodonQuoteLinkSection } from "utils/tweet/split-tweet-text/get-mastodon-quote-link-section";

export async function splitTextForMastodon(
  tweet: Tweet,
  args: {
    quotedTweetId: string;
    mastodonUsername: string;
    mastodonInstance: string;
  },
  // mastodonUsername: string
): Promise<string[]> {
  const { text, quotedStatusId, urls } = tweet;
  const maxChunkSize = MASTODON_MAX_POST_LENGTH;

  const quotedStatusLinkSection = await getMastodonQuoteLinkSection(
    // quotedStatusId,
    // args,
    args,
  );

  if (quotedStatusId) {
    // Ensure quoted link fits with text in a single chunk
    if (text!.length + quotedStatusLinkSection.length <= maxChunkSize) {
      return [text! + quotedStatusLinkSection];
    }
  } else if (text!.length <= maxChunkSize) {
    return [text!];
  }

  return splitTweetTextCore(
    text!,
    urls,
    Platform.MASTODON,
    quotedStatusId,
    maxChunkSize,
    quotedStatusLinkSection,
  );
}
