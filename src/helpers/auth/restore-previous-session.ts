import { Scraper } from "@the-convocation/twitter-scraper";

import { getCookies } from "../cookies/get-cookies";
import { TouitomamoutError } from "../error";

export const restorePreviousSession = async (
  client: Scraper,
): Promise<void> => {
  try {
    const cookies = await getCookies();
    if (cookies) {
      // weird issue
      await client.setCookies(cookies.map(v => v.toString()));
    } else {
      throw new Error("Unable to restore cookies");
    }
  } catch (err) {
    console.log(
      TouitomamoutError(err as string, [
        "Logging in with credentials instead.",
      ]),
    );
  }
};
