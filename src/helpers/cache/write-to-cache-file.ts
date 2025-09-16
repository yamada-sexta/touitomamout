// import { CACHE_PATH } from "../../env";
import { Cache } from "../../types";
import { TouitomamoutError } from "../error";

export async function writeToCacheFile(args:
  { cache: Cache, cachePath: string }) {
  try {
    // writeFileSync(CACHE_PATH, JSON.stringify(cache));
    await Bun.write(args.cachePath, JSON.stringify(args.cache));
  } catch (err) {
    console.error(
      TouitomamoutError("Error while updating the cache file", []),
      err,
    );
  }
};
