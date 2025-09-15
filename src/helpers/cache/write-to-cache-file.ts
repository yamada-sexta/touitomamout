import { CACHE_PATH } from "../../constants";
import { Cache } from "../../types";
import { TouitomamoutError } from "../error";

export async function writeToCacheFile (cache: Cache) {
  try {
    // writeFileSync(CACHE_PATH, JSON.stringify(cache));
    await Bun.write(CACHE_PATH, JSON.stringify(cache));
  } catch (err) {
    console.error(
      TouitomamoutError("Error while updating the cache file", []),
      err,
    );
  }
};
