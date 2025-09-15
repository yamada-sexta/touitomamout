// Import 'unlink' along with 'readFile'
import { readFile, unlink } from "node:fs/promises";
import { Cookie } from "tough-cookie";
import { COOKIES_PATH } from "../../constants";

export const getCookies = async (): Promise<Cookie[] | null> => {
  try {
    const fileContent = await readFile(COOKIES_PATH, "utf-8");

    // This is the line that will throw an error if the file is v4
    return Object.values(JSON.parse(fileContent)).reduce((acc: Cookie[], c) => {
      const cookie = Cookie.fromJSON(JSON.stringify(c));
      return cookie ? [...acc, cookie] : acc;
    }, []);
  } catch (err) {
    // If parsing fails, the file is incompatible or corrupt.
    console.error("Incompatible or corrupt cookie file detected. Deleting it.", err);
    
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
};