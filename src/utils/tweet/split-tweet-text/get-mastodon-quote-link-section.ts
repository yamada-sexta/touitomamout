// import { MASTODON_INSTANCE } from "../../../env";
import { MastodonCacheChunk, Platform } from "../../../types";
import { getCachedPostChunk } from "../../cache/get-cached-post-chunk";

export async function getMastodonQuoteLinkSection(args: {
  quotedTweetId: string;
  mastodonUsername: string;
  mastodonInstance: string;
}) {
  // if (!quotedTweetId || !mastodonUsername) {
  // return "";
  // }

  const mastodonQuotedId = await getCachedPostChunk<MastodonCacheChunk>(
    Platform.MASTODON,
    "last",
    args.quotedTweetId,
  );

  return `\n\nhttps://${args.mastodonInstance}/@${args.mastodonUsername}/${mastodonQuotedId}`;
}
