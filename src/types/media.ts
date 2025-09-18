import { ComAtprotoRepoUploadBlob } from "@atproto/api";
import { Photo, Video } from "@the-convocation/twitter-scraper";

export type Media =
  | {
      type: "image";
      photo: Photo;
      blob: Blob;
      // alt_text?: string
    }
  | {
      type: "video";
      video: Video;
      blob: Blob;
    };
// (Photo & { type: "image" }) | (Video & { type: "video" });
export type BlueskyMediaAttachment = ComAtprotoRepoUploadBlob.Response & {
  alt_text?: string;
};
