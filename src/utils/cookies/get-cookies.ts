import { unlink } from "node:fs/promises";

import { Cookie } from "tough-cookie";

import { COOKIES_PATH } from "../../env";

export async function getCookies(args?: {
  cookiePath: string;
}): Promise<Cookie[] | null> {
  try {
    const cookieStore = await Bun.file(COOKIES_PATH).json();
    return Object.values(cookieStore).reduce((acc: Cookie[], c: any) => {
      // Cookie.fromJSON can accept the plain JavaScript object directly
      const cookie = Cookie.fromJSON(c);
      return cookie ? [...acc, cookie] : acc;
    }, []);
  } catch (err) {
    // If parsing fails, the file is incompatible or corrupt.
    console.error(
      "Incompatible or corrupt cookie file detected. Deleting it.",
      err,
    );

    try {
      // Add this line to delete the file
      await unlink(COOKIES_PATH);
    } catch (deleteErr) {
      // Log an error if deletion fails (e.g., permissions)
      console.error("Failed to delete cookie file:", deleteErr);
    }

    // Return null so the app knows there are no cookies for this session
    return null;
  }
}
