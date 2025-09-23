import { Tweet } from "@the-convocation/twitter-scraper";
import { decode } from "html-entities";
import { ValidPost } from "./post";

export interface MetaTweet extends ValidPost {
    datetime: Date;
    formattedText: string;
}

export const formatTweetText = (tweet: Tweet): string => {
    let text = tweet.text ?? "";

    // Replace urls
    tweet.urls.forEach((url) => {
        text = text.replace(/https:\/\/t\.co\/\w+/, url);
    });

    // Remove medias t.co links
    text = text.replaceAll(/https:\/\/t\.co\/\w+/g, "");

    // Replace HTML entities with their unicode equivalent
    text = decode(text);

    // Return formatted
    return text.trim();
};

/**
 * Converts a raw Tweet object into a MetaTweet object.
 * This adds a proper Date object and a formatted text string.
 * @param tweet The original Tweet object from the scraper.
 * @returns A MetaTweet object with added `datetime` and `formattedText` fields.
 */
export const toMetaTweet = (tweet: ValidPost): MetaTweet => {
    return {
        ...tweet,
        datetime: new Date((tweet.timestamp ?? 0) * 1000),
        formattedText: formatTweetText(tweet),
    };
};
