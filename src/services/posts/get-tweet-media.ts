import { Tweet } from "@the-convocation/twitter-scraper";
import { downloadMedia } from "helpers/download-media";
// import { downloadMedia } from "helpers/download-media";
import { Media } from "types";

export async function getTweetMedia(tweet: Tweet): Promise<Media[]> {
    return await Promise.all<Media>(
        [
            ...tweet.photos
                .map(
                    async photo => {
                        return {
                            type: "image", photo: photo, blob: await downloadMedia(photo.url!)
                        } as Media
                    }
                ),
            ...tweet.videos
                .filter(video => !!video.url)
                .map(
                    async video => {
                        return {
                            type: "video", video, blob: await downloadMedia(video.url!)
                        } as Media
                    }
                )
        ]
    )
}