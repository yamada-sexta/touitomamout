import { Agent } from "@atproto/api";
import { DBType } from "db";
import { ValidPost } from "types/post";

export async function createBlueskyPost(args: {
  client: Agent;
  tweet: ValidPost;
  blueskyIdentifier: string;
  db: DBType;
}) {
  const { client, tweet } = args;

  const username = await client
    .getProfile({ actor: args.blueskyIdentifier })
    .then((account) => account.data.handle);

  const quotePost = undefined;
  if (tweet.quotedStatus && tweet.quotedStatus.id) {
    const xQouteId = tweet.quotedStatus.id;
  }
}
