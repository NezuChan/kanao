import process from "node:process";
import type { Config } from "drizzle-kit";

export default {
    schema: "./dist/index.js",
    out: "./drizzle",
    driver: "pg",
    dbCredentials: {
        connectionString: process.env.DATABASE_URL!
    }
} satisfies Config;
