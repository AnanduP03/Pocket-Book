import mongoose, { type Mongoose } from "mongoose";
import { MONGODB_URI } from "@/lib/config";

type Cache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const globalCache = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (globalCache.__mongoose ??= {
  conn: null,
  promise: null,
});

export async function connectDb(): Promise<Mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5_000,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}

export async function disconnectDb(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}
