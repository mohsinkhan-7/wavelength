import mongoose from 'mongoose';

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI is not set');
  mongoose.set('strictQuery', true);
  // Fail fast (10s) with a clear error instead of hanging for the default 30s
  // when the host can't be reached — usually an Atlas IP-allowlist issue.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB');
}
