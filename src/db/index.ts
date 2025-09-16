import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { migrate } from "db/migration";

import * as schema from "db/schema/v2";
export const Schema = schema;

const sqlite = new Database("sqlite.db", {
    create: true,
    safeIntegers: true,
    strict: true,
});
export type DBType = BunSQLiteDatabase<typeof Schema>

export const db: DBType = await migrate(
    drizzle({
        client: sqlite,
    })
)
// await migrate(db);
