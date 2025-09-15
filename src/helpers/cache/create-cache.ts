import { access, constants } from "node:fs/promises";

import { CACHE_PATH, INSTANCE_ID } from "../../constants";
import { writeToCacheFile } from "./write-to-cache-file";

export async function createCacheFile() {
  try {
    // Check if the file exists
    await access(CACHE_PATH, constants.F_OK);
  } catch {
    await writeToCacheFile({
      version: "0.2",
      instance: { id: INSTANCE_ID },
      profile: { avatar: "", banner: "" },
      posts: {},
    });
  }
};
