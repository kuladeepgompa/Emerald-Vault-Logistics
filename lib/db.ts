import { MongoClient, Db } from "mongodb";

// Support both MONGODB_URI and DATABASE_URL (common on Vercel)
const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
    // We create a promise that will only throw when awaited.
    // This prevents the build from crashing during module evaluation.
    clientPromise = Promise.reject(new Error("Please add your Mongo URI (MONGODB_URI or DATABASE_URL) to your environment variables"));
} else {
    if (process.env.NODE_ENV === "development") {
        // In development mode, use a global variable so that the value
        // is preserved across module reloads caused by HMR (Hot Module Replacement).
        let globalWithMongo = global as typeof globalThis & {
            _mongoClientPromise?: Promise<MongoClient>;
        };

        if (!globalWithMongo._mongoClientPromise) {
            client = new MongoClient(uri);
            globalWithMongo._mongoClientPromise = client.connect();
        }
        clientPromise = globalWithMongo._mongoClientPromise;
    } else {
        // In production mode, it's best to not use a global variable.
        client = new MongoClient(uri);
        clientPromise = client.connect();
    }
}

export async function getDb(): Promise<Db> {
    const connectedClient = await clientPromise;
    return connectedClient.db();
}

// Export the promise as default for NextAuth compatibility
export default clientPromise;
