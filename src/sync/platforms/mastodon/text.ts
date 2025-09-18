import { Tweet } from "@the-convocation/twitter-scraper";
import { DBType } from "db";
import { MASTODON_MAX_POST_LENGTH } from "env";
import { getPostStore } from "utils/get-post-store";
import { getMastodonQuoteLinkSection } from "utils/tweet/split-tweet-text/get-mastodon-quote-link-section";
import { splitTweetTextCore } from "utils/tweet/split-tweet-text/split-tweet-text";
import { MastodonStoreSchema, MastodonSynchronizerFactory } from ".";
import { MastodonPostSynchronizer } from "sync/posts/mastodon";

export async function splitTextForMastodon(
  tweet: Tweet,
  args: {
    db: DBType;
    quotedTweetId: string;
    mastodonUsername: string;
    mastodonInstance: string;
  }
  // mastodonUsername: string
): Promise<string[]> {
  const { text, quotedStatusId, urls } = tweet;
  const maxChunkSize = MASTODON_MAX_POST_LENGTH;

  const store = await getPostStore({
    s: MastodonStoreSchema,
    db: args.db,
    tweet,
    platformId: MastodonSynchronizerFactory.PLATFORM_ID,
  });

  if (quotedStatusId && store.success) {
    const tootId = store.data.tootId;
    const quotedStatusLinkSection = getMastodonQuoteLinkSection(
      // quotedStatusId,
      // args,
      args
    );
    // Ensure quoted link fits with text in a single chunk
    if (text!.length + quotedStatusLinkSection.length <= maxChunkSize) {
      return [text! + quotedStatusLinkSection];
    }
  } else if (text!.length <= maxChunkSize) {
    return [text!];
  }

  return splitTweetTextCore({
    text: text ?? "",
    urls,
    // Platform.MASTODON,
    quotedStatusId,
    maxChunkSize,
    quotedStatusLinkSection,
    appendQuoteLink: true,
  });
}
