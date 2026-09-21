import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Email Access",
            credentials: {
                email: { label: "Email", type: "email" },
                name: { label: "Name", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.email) return null;
                const email = credentials.email.toLowerCase().trim();
                const db = await getDb();
                let dbUser = await db.collection("User").findOne({ email });

                const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(e => e.trim()).filter(Boolean);
                const isExplicitAdmin = adminEmails.includes(email);

                if (!dbUser) {
                    const userCount = await db.collection("User").countDocuments();
                    const role = (isExplicitAdmin || userCount === 0) ? "ADMIN" : "STAFF";
                    const result = await db.collection("User").insertOne({
                        email,
                        name: credentials.name || email.split("@")[0],
                        image: "",
                        role,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    return {
                        id: result.insertedId.toString(),
                        email,
                        name: credentials.name || email.split("@")[0],
                        role
                    };
                }

                const role = isExplicitAdmin ? "ADMIN" : dbUser.role;

                return {
                    id: dbUser._id.toString(),
                    email: dbUser.email,
                    name: dbUser.name,
                    role
                };
            }
        })
    ],
    callbacks: {
        async signIn() {
            return true;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role || "STAFF";
                (session.user as any).id = token.id || token.sub;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role || "STAFF";
                token.id = user.id || token.sub;
            } else if (!token.role || !token.id) {
                try {
                    if (token.email) {
                        const db = await getDb();
                        const dbUser = await db.collection("User").findOne({ email: token.email });
                        if (dbUser) {
                            token.role = dbUser.role;
                            token.id = dbUser._id.toString();
                        }
                    }
                } catch (err) {
                    console.error("JWT lookup error:", err);
                }
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
    useSecureCookies: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" || process.env.VERCEL === "1" ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET || "emerald-vault-logistics-fallback-secret-key-32chars",
};
