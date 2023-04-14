import { compress as MongoCompress, decompress as MongoDecompress } from "@mongodb-js/zstd";
import { cacheCompressionLevel } from "../../config.js";
import { Result } from "@sapphire/result";

export const compress = async (data: string): Promise<Buffer | string | null> => {
    const result = await Result.fromAsync(() => MongoCompress(Buffer.from(data), cacheCompressionLevel));
    if (result.isOk()) return result.unwrap();
    return null;
};

export const decompress = async (data: string): Promise<string | null> => {
    const result = await Result.fromAsync(() => MongoDecompress(Buffer.from(data)));
    if (result.isOk()) return result.unwrap().toString("utf-8");
    return null;
};
