import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer = null;

export async function connectToDb({ logger }) {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    logger?.warn(
      'MONGODB_URI not set. Starting in-memory MongoDB for local testing.'
    );
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'job_hunter' }
    });
    uri = memoryServer.getUri();
    process.env.MONGODB_URI = uri;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  logger?.info({ uri: redactMongoUri(uri) }, 'mongodb connected');
}

function redactMongoUri(uri) {
  try {
    const u = new URL(uri);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return uri;
  }
}

