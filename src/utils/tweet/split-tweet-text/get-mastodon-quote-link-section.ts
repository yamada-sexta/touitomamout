export async function getMastodonQuoteLinkSection(args: {
  mastodonQuotedId: string;
  mastodonUsername: string;
  mastodonInstance: string;
}) {
  // if (!quotedTweetId || !mastodonUsername) {
  // return "";
  // }

  // const mastodonQuotedId = await getCachedPostChunk<MastodonCacheChunk>(
  //   Platform.MASTODON,
  //   "last",
  //   args.quotedTweetId,
  // );

  return `\n\nhttps://${args.mastodonInstance}/@${args.mastodonUsername}/${args.mastodonQuotedId}`;
}
