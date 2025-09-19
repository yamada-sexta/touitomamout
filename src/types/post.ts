import { Tweet } from "@the-convocation/twitter-scraper";



export interface ValidPost extends Tweet {
  id: string;
}

export function isValidPost(tweet: Tweet): tweet is ValidPost {
  return "id" in tweet;
}
