import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

const s0 = {};
import * as s1 from "./schema";
import {
  generateSQLiteMigration,
  generateSQLiteDrizzleJson,
} from "drizzle-kit/api";

const schemas = [s0, s1];

export async function migrate(db: BunSQLiteDatabase) {
  for (let i = 1; i < schemas.length; i++) {
    const prevSchema = schemas[i - 1];
    const currSchema = schemas[i];
    const migrationStatements = await generateSQLiteMigration(
      await generateSQLiteDrizzleJson(prevSchema),
      await generateSQLiteDrizzleJson(currSchema)
    );

    for (const s of migrationStatements) {
      db.run(s);
    }
  }
}
