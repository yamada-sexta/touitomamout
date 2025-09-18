import { Agent, BskyAgent, CredentialSession } from "@atproto/api";
import { ResponseType } from "@atproto/xrpc";
import { SYNC_BLUESKY, TwitterHandle } from "env";
import ora from "ora";
import { TouitomamoutError } from "utils/error";
import { oraPrefixer } from "utils/logs/ora-prefixer";

export async function createBlueskyClient(args: {
  handle: TwitterHandle;
}): Promise<[Agent, string] | void> {
  if (!SYNC_BLUESKY) {
    console.log("Will not sync bluesky...");
    return;
  }
  const log = ora({
    color: "gray",
    prefixText: oraPrefixer("☁️ client"),
  }).start("connecting to bluesky...");

  try {
    let blueskyInstance = process.env["BLUESKY_INSTANCE" + args.handle.postFix];
    if (!blueskyInstance) {
      console.log("Using default instance for bluesky...");
    }
    blueskyInstance = blueskyInstance || "bsky.social";

    const session = new CredentialSession(
      new URL(`https://${blueskyInstance}`),
    );
    // ? there is literally no documentation on the alternative
    const agent = new BskyAgent(session);

    const identifier = process.env["BLUESKY_IDENTIFIER" + args.handle.postFix];
    if (!identifier) {
      console.log(`BLUESKY_IDENTIFIER is not set for ${args.handle}`);
      return;
    }
    const password = process.env["BLUESKY_PASSWORD" + args.handle.postFix];
    if (!password) {
      console.log(`BLUESKY_IDENTIFIER is not set for ${args.handle}`);
      return;
    }

    await agent.login({
      identifier,
      password,
    });
    log.succeed("connected");
    return [agent, identifier];
  } catch (error) {
    log.fail("authentication failure");
    switch (error) {
      case ResponseType[ResponseType.AuthenticationRequired]:
        throw new Error(
          TouitomamoutError(
            "Touitomamout was unable to connect to bluesky with the given credentials",
            ["Please check your .env settings."],
          ),
        );
      case ResponseType[ResponseType.XRPCNotSupported]:
        throw new Error(
          TouitomamoutError(
            "The bluesky instance you have provided is not a bluesky instance",
            [
              "Please check your .env settings.",
              "A common error is to provide a bluesky web-client domain instead of the actual bluesky instance",
            ],
          ),
        );
      case ResponseType[ResponseType.RateLimitExceeded]:
        throw new Error(
          TouitomamoutError(
            "You are currently rate limited by the bluesky instance you have provided",
            [],
          ),
        );
      default:
        console.log(error);
    }
  }
}
