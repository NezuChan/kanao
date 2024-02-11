import { relations } from "drizzle-orm";
import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

export const embed = pgTable("embed", {
    messageId: text("message_id").primaryKey(),
    title: text("title"),
    type: text("type"),
    description: text("description"),
    url: text("url"),
    timestamp: text("timestamp"),
    color: integer("color"),
    footerId: text("footer_id"),
    imageId: text("image_id"),
    thumbnailId: text("thumbnail_id"),
    videoId: text("video_id"),
    providerId: text("provider_id"),
    authorId: text("author_id")
});

export const embedFooter = pgTable("embed_footer", {
    embedId: text("embed_id").primaryKey(),
    text: text("text"),
    iconUrl: text("icon_url"),
    proxyIconUrl: text("proxy_icon_url")
});

export const embedImage = pgTable("embed_image", {
    embedId: text("embed_id").primaryKey(),
    url: text("url"),
    proxyUrl: text("proxy_url"),
    height: integer("height"),
    width: integer("width")
});

export const embedThumbnail = pgTable("embed_thumbnail", {
    embedId: text("embed_id").primaryKey(),
    url: text("url"),
    proxyUrl: text("proxy_url"),
    height: integer("height"),
    width: integer("width")
});

export const embedVideo = pgTable("embed_video", {
    embedId: text("embed_id").primaryKey(),
    url: text("url"),
    proxyUrl: text("proxy_url"),
    height: integer("height"),
    width: integer("width")
});

export const embedProvider = pgTable("embed_provider", {
    embedId: text("embed_id").primaryKey(),
    name: text("name"),
    url: text("url")
});

export const embedAuthor = pgTable("embed_author", {
    embedId: text("embed_id").primaryKey(),
    name: text("name"),
    url: text("url"),
    iconUrl: text("icon_url"),
    proxyIconUrl: text("proxy_icon_url")
});

export const embedField = pgTable("embed_field", {
    fieldId: text("field_id").primaryKey(),
    embedId: text("embed_id"),
    name: text("name"),
    value: text("value"),
    inline: boolean("inline")
});

export const embedFieldRelation = relations(embedField, ({ one }) => ({
    embed: one(embed, {
        fields: [embedField.embedId],
        references: [embed.messageId]
    })
}));

export const embedRelation = relations(embed, ({ one, many }) => ({
    footer: one(embedFooter, {
        fields: [embed.footerId],
        references: [embedFooter.embedId]
    }),
    image: one(embedImage, {
        fields: [embed.imageId],
        references: [embedImage.embedId]
    }),
    thumbnail: one(embedThumbnail, {
        fields: [embed.thumbnailId],
        references: [embedThumbnail.embedId]
    }),
    video: one(embedVideo, {
        fields: [embed.videoId],
        references: [embedVideo.embedId]
    }),
    provider: one(embedProvider, {
        fields: [embed.providerId],
        references: [embedProvider.embedId]
    }),
    author: one(embedAuthor, {
        fields: [embed.authorId],
        references: [embedAuthor.embedId]
    }),
    fields: many(embedField)
}));
