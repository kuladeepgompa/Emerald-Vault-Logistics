import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn() {
            return true;
        },
        async session({ session, token }) {
            if (session.user?.email) {
                try {
                    const db = await getDb();
                    const dbUser = await db.collection("User").findOne({ email: session.user.email });
                    
                    if (dbUser) {
                        (session.user as any).role = dbUser.role;
                        (session.user as any).id = dbUser._id.toString();
                    } else {
                        // Fallback to token if user not found in DB
                        (session.user as any).role = token.role;
                        (session.user as any).id = token.id;
                    }
                } catch (error) {
                    console.error("Error in session callback:", error);
                    (session.user as any).role = token.role;
                    (session.user as any).id = token.id;
                }
            }
            return session;
        },
        async jwt({ token, user, trigger }) {
            if (user) {
                // This only runs on first login/sign in
                const db = await getDb();
                let dbUser = await db.collection("User").findOne({ email: user.email });

                if (!dbUser) {
                    // Check if this is the first user
                    const userCount = await db.collection("User").countDocuments();
                    const role = userCount === 0 ? "ADMIN" : "STAFF";

                    // Auto-create user on first sign-in
                    const result = await db.collection("User").insertOne({
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        role: role,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    token.role = role;
                    token.id = result.insertedId.toString();
                } else {
                    token.role = dbUser.role;
                    token.id = (dbUser._id as ObjectId).toString();
                }
            } else if (trigger === "update") {
                // Handle manual updates if needed
            }
            return token;
        }
    },
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/signin",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
