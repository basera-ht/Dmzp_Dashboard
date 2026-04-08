import { pgTable, varchar, timestamp, serial, pgEnum } from "drizzle-orm/pg-core";
import { db } from "./src/database/index.js";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE reports ALTER COLUMN report_type DROP DEFAULT;`);
  await db.execute(sql`ALTER TABLE reports ALTER COLUMN report_type TYPE varchar(255) USING report_type::varchar;`);
  await db.execute(sql`DROP TYPE IF EXISTS report_type;`);
  console.log("Altered successfully.");
  process.exit(0);
}
main().catch(console.error);
