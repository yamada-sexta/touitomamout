import { Tweet } from "@the-convocation/twitter-scraper";
import { Ora } from "ora";

import { Media } from "../../types"; // Adjust path as needed

/**
 * Interface for a service that can synchronize (create and send) a post
 * to a specific platform.
 */
export interface PostSynchronizer {
  syncPost(args: { tweet: Tweet; mediaList: Media[]; log: Ora }): Promise<void>;
}
