import { relations } from "drizzle-orm";
import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

export const embed = pgTable("embed", {
    title: text("title"),
    type: text("type"),
    description: text("description"),
    url: text("url"),
    timestamp: text("timestamp"),
    color: integer("color"),
    footerId: text("footer_id"),
});

export const embedFooter = pgTable("embed_footer", {
    id: text("id").primaryKey(),
    text: text("text"),
    iconUrl: text("icon_url"),
    proxyIconUrl: text("proxy_icon_url"),
});

export const embedRelation = relations(embed, ({ one }) => ({
    footer: one(embedFooter, {
        fields: [embed.footerId],
        references: [embedFooter.id],
    }),
}))
