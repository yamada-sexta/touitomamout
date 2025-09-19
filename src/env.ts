import { accessSync, constants } from "node:fs";
import { join } from "node:path";

import packageInfo from "../package.json" assert { type: "json" };

if (process.env.NODE_ENV !== "test") {
  const envPath = process.argv[2] ?? join(process.cwd(), ".env");
  if (envPath.endsWith("example")) {
    throw new Error("You should not use the example configuration file.");
  }
  try {
    accessSync(envPath, constants.F_OK);
  } catch (_) {
    console.log("No suitable .env file found.");
  }
}

const trimTwitterHandle = (handle: string) => {
  return handle.toLowerCase().trim().replaceAll("@", "");
};

export const TWITTER_HANDLES: TwitterHandle[] = [];
type TwitterHandleKey<T extends number | ""> = `TWITTER_HANDLE${T}`;
export interface TwitterHandle<T extends number | "" = "" | number> {
  env: TwitterHandleKey<T>;
  postFix: T;
  handle: string;
  slot: number;
}

let _handleCounter = 0;
let _twitterHandleKey: TwitterHandleKey<"" | number> = `TWITTER_HANDLE`;
export const INSTANCE_IDS: string[] = [];
while (process.env[_twitterHandleKey]) {
  const handle = trimTwitterHandle(process.env[_twitterHandleKey] as string);
  console.log(`Found ${_twitterHandleKey}: @${handle}`);
  TWITTER_HANDLES.push({
    env: _twitterHandleKey,
    handle,
    postFix: _handleCounter ? _handleCounter : "",
    slot: _handleCounter,
  });
  INSTANCE_IDS.push(handle.toLocaleLowerCase().replaceAll(" ", "_"));
  _handleCounter += 1;
  _twitterHandleKey = `TWITTER_HANDLE${_handleCounter}`;
}

export const TWITTER_USERNAME = trimTwitterHandle(
  process.env.TWITTER_USERNAME ?? "",
);
export const TWITTER_PASSWORD = (process.env.TWITTER_PASSWORD ?? "").trim();
// export const STORAGE_DIR = process.env.STORAGE_DIR ?? process.cwd();
export const DATABASE_PATH = (
  process.env.DATABASE_PATH ?? "data.sqlite"
).trim();
// export const CACHE_PATH = `${STORAGE_DIR}/cache.${INSTANCE_ID}.json`;
// export const COOKIES_PATH = `${STORAGE_DIR}/cookies.v6.${TWITTER_USERNAME}.json`;
export const SYNC_MASTODON = (process.env.SYNC_MASTODON ?? "true") === "true";
export const SYNC_BLUESKY = (process.env.SYNC_BLUESKY ?? "true") === "true";
export const BACKDATE_BLUESKY_POSTS =
  (process.env.BACKDATE_BLUESKY_POSTS ?? "true") === "true";
export const SYNC_FREQUENCY_MIN = parseInt(
  process.env.SYNC_FREQUENCY_MIN ?? "30",
);
export const SYNC_PROFILE_DESCRIPTION =
  (process.env.SYNC_PROFILE_DESCRIPTION ?? "true") === "true";
export const SYNC_PROFILE_PICTURE =
  (process.env.SYNC_PROFILE_PICTURE ?? "true") === "true";
export const SYNC_PROFILE_NAME =
  (process.env.SYNC_PROFILE_NAME ?? "true") === "true";
export const SYNC_PROFILE_HEADER =
  (process.env.SYNC_PROFILE_HEADER ?? "true") === "true";
export const SYNC_DRY_RUN = (process.env.SYNC_DRY_RUN ?? "false") === "true";
export const DEBUG = (process.env.TOUITOMAMOUT_DEBUG ?? "false") === "true";
export const DAEMON = (process.env.DAEMON ?? "true") === "true";
export const VOID = "∅";
export const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT ?? "30");
export const TOUITOMAMOUT_VERSION = packageInfo.version ?? "0.0.0";
export const MASTODON_MAX_POST_LENGTH = 500;
export const BLUESKY_MAX_POST_LENGTH = 300;
export const BLUESKY_MEDIA_MAX_SIZE_BYTES = 976560;
export const MAX_CONSECUTIVE_CACHED = 5;
export const FORCE_SYNC_POSTS =
  (process.env.FORCE_SYNC_POSTS ?? "false") === "true";


export const SYNC_POSTS = (process.env.SYNC_POSTS ?? "true") === "true";