import { CACHE_PATH } from "../../env";
import { Cache } from "../../types";

/**
 * A method to get the cache.
 */
export async function getCache(): Promise<Cache> {
  try {
    // const fileContent = await readFile(CACHE_PATH, "utf-8");
    // return JSON.parse(fileContent);
    return await Bun.file(CACHE_PATH).json();
  } catch {
    return {
      instance: { id: "" },
      posts: {},
      profile: { avatar: "", banner: "" },
      version: "",
    };
  }
};
