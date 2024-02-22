import type { Config } from "drizzle-kit";

export default {
    schema: "./src/structures/DatabaseSchema.ts",
    out: "./drizzle",
    driver: "better-sqlite",
    dbCredentials: {
        url: "./storage/kanao-gateway.db"
    }
} satisfies Config;
