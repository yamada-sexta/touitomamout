import { DEBUG } from "env";
// import { LinkMetadata } from "../../types/link-metadata";
import { z } from "zod";

const LinkMetadataSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  image: z.string().default(""),
  // Use .optional() for fields that might not be present
  error: z.string().default(""),
  Error: z.string().optional(),
  likely_type: z.string().optional(),
  url: z
    .url()
    .or(z.literal(""))
    .optional()
    .transform((val) => (val ? val : null)),
});
export type LinkMetadata = z.infer<typeof LinkMetadataSchema>;

/**
 * Fetches metadata for a given URL.
 * @param {string} url - The URL for which to fetch metadata.
 * @returns {Promise<LinkMetadata> | null} - A promise that resolves with the fetched metadata or null if an error occurred.
 */
export async function fetchLinkMetadata(
  url: string,
): Promise<LinkMetadata | null> {
  try {
    const res = await fetch(
      `https://cardyb.bsky.app/v1/extract?url=${encodeURI(url)}`,
      {
        method: "GET",
      },
    );
    const obj = (await res.json()) as unknown;
    const validationResult = LinkMetadataSchema.safeParse(obj);
    if (!validationResult.success) {
      // Zod gives you detailed errors about what went wrong!
      console.error(
        "Schema validation failed:",
        obj,
        z.treeifyError(validationResult.error),
      );
      return null;
    }
    const data = validationResult.data;
    if (data.error || data.Error) {
      return null;
    }
    if (DEBUG) console.log("metadata: ", data);
    return data;
  } catch (e) {
    console.error(`Error while fetching link metadata: ${e}`);
    return null;
  }
}
