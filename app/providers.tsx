"use client";

import { SessionProvider } from "next-auth/react";
import { GodownProvider } from "@/components/GodownProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <GodownProvider>
                {children}
            </GodownProvider>
        </SessionProvider>
    );
}
