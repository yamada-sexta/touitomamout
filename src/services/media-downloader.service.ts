import ora from 'ora';

/**
 * A method to download the media.
 */
export async function downloadMedia(url: string): Promise<Blob> {
  const spinner = ora('Downloading media...').start();
  try {
    const res = await fetch(url);
    // return await fetch(url).then((res) => res.blob());

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status} ${res.statusText}`);
    }
    const blob = await res.blob();
    spinner.succeed('Media downloaded successfully');
    return blob;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    spinner.fail(`Unable to download media: ${errorMessage}`);
    throw new Error(`Unable to download media:\n${err}`);
  }
};
