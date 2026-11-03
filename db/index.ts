import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure your database in deploy/cloudflare/wrangler.jsonc before enabling the optional research backend."
    );
  }

  return drizzle(env.DB, { schema });
}
