import ora from "ora";
import { oraProgress } from "../logs";

/**
 * A method to download the media.
 */
export async function download(
  url?: string,
  description?: string
): Promise<Blob | undefined> {
  if (!url) {
    return;
  }
  // Create a shorter URL for display, e.g., first 50 chars + "..."
  const displayUrl =description?? (url.length > 50 ? `${url.substring(0, 50)}...` : url);
  // const spinner = ora(`Downloading: ${url.}`).start();
  // const spinner = ora(`Downloading: ${displayUrl}`).start();
  const spinner = ora(`Connecting: ${displayUrl}`).start();

  try {
    // 1. Start the fetch request
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error("Response body is not readable.");
    }

    const contentType =
      res.headers.get("content-type") || "application/octet-stream";
    const contentLength = Number(res.headers.get("content-length")) || 0;

    const reader = res.body.getReader();

    let received = 0;
    const chunks: BlobPart[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        received += value.length;

        // update progress bar
        oraProgress(
          spinner,
          { before: "Downloading", after: displayUrl },
          received,
          contentLength
        );
      }
    }
    const blob = new Blob(chunks, { type: contentType });
    spinner.succeed(`${displayUrl} downloaded successfully`);
    return blob;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    spinner.fail(`Unable to download media: ${errorMessage}`);
    // throw new Error(`Unable to download media:\n${err}`);
    return undefined;
  }
}
