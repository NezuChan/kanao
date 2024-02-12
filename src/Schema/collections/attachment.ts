import { pgTable, text, boolean, integer, decimal } from "drizzle-orm/pg-core";

export const attachment = pgTable("attachment", {
    id: text("id").primaryKey(),
    fileName: text("file_name"),
    description: text("description"),
    contentType: text("content_type"),
    size: integer("size"),
    url: text("url"),
    proxyUrl: text("proxy_url"),
    height: integer("height"),
    width: integer("width"),
    ephemeral: boolean("ephemeral"),
    durationSecs: decimal("duration_secs"),
    waveform: text("waveform"),
    flags: integer("flags")
});
