import { Tweet } from "@the-convocation/twitter-scraper";
// import { downloadMedia } from "helpers/download-media";
import { Media } from "types";
import { download } from "utils/medias/download-media";

export async function getTweetMedia(tweet: Tweet): Promise<Media[]> {
  return await Promise.all<Media>([
    ...tweet.photos.map(async (photo) => {
      return {
        type: "image",
        photo: photo,
        blob: await download(photo.url!),
      } as Media;
    }),
    ...tweet.videos
      .filter((video) => !!video.url)
      .map(async (video) => {
        return {
          type: "video",
          video,
          blob: await download(video.url!),
        } as Media;
      }),
  ]);
}
