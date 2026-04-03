"use client";

import { useGodown } from "@/components/GodownProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function WarehouseGuard({ children }: { children: React.ReactNode }) {
    const { selectedWarehouse, isLoading } = useGodown();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !selectedWarehouse && pathname !== "/select-org" && !pathname?.startsWith("/api")) {
            router.push("/select-org");
        }
    }, [selectedWarehouse, isLoading, router, pathname]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading Warehouse...</div>;
    }

    if (!selectedWarehouse && pathname !== "/select-org") {
        return null; // Don't render children while redirecting
    }

    return <>{children}</>;
}
