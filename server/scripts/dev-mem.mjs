// Run the backend against a throwaway in-memory MongoDB — no database install
// needed. Handy for demos and local development.
//
//   npm run dev:mem
//
// Data is wiped when the process stops.
import os from 'node:os';
import { join } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Keep the mongod binary OUT of the OneDrive-synced project folder — OneDrive
// dehydrates it to a cloud placeholder, which makes mongod hang/fail to launch.
process.env.MONGOMS_DOWNLOAD_DIR =
  process.env.MONGOMS_DOWNLOAD_DIR || join(os.homedir(), '.cache', 'mongodb-binaries');
process.env.MONGOMS_PREFER_GLOBAL_PATH = '1';

// Give mongod plenty of time to start (first launch can be slow under AV).
const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-mem-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
process.env.PORT = process.env.PORT || '4000';

console.log('🧪 Using in-memory MongoDB (data is not persisted).');
await import('../src/index.js');

async function shutdown() {
  await mongod.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
