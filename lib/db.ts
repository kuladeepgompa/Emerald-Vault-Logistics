import { MongoClient, Db } from "mongodb";

// Support both MONGODB_URI and DATABASE_URL (common on Vercel)
const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

let clientPromise: Promise<MongoClient>;

if (!uri) {
    // We create a promise that will only throw when awaited.
    // This prevents the build from crashing during module evaluation.
    clientPromise = Promise.reject(
        new Error("Please add your Mongo URI (MONGODB_URI or DATABASE_URL) to environment variables")
    );
} else {
    // In serverless environments (like Vercel), caching the client promise on globalThis
    // prevents creating a new connection for every function invocation.
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        const client = new MongoClient(uri);
        globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
            // Log connection error without crashing module initialization
            console.error("MongoDB Connection Error:", err);
            throw err;
        });
    }
    clientPromise = globalWithMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
    const connectedClient = await clientPromise;
    return connectedClient.db();
}

// Export the promise as default for NextAuth compatibility
export default clientPromise;

