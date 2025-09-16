import { access, constants } from "node:fs/promises";

// import { CACHE_PATH, INSTANCE_ID } from "../../env";
import { writeToCacheFile } from "./write-to-cache-file";

export async function createCacheFile(
  args: {
    cachePath: string,
    instanceId: string,
  }
) {
  try {
    // Check if the file exists
    await access(args.cachePath, constants.F_OK);
  } catch {
    await writeToCacheFile({
      cache: {
        version: "0.2",
        instance: { id: args.instanceId },
        profile: { avatar: "", banner: "" },
        posts: {},
      },
      cachePath: args.cachePath
    });
  }
};
