"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Warehouse {
    id: string;
    name: string;
    location: string;
}

interface GodownContextType {
    selectedWarehouse: Warehouse | null;
    setSelectedWarehouse: (warehouse: Warehouse | null) => void;
    isLoading: boolean;
}

const GodownContext = createContext<GodownContextType | undefined>(undefined);

export function GodownProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem("selectedWarehouse");
        if (saved) {
            try {
                setSelectedWarehouse(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved warehouse", e);
            }
        }
        setIsLoading(false);
    }, []);

    const updateSelectedWarehouse = (warehouse: Warehouse | null) => {
        setSelectedWarehouse(warehouse);
        if (warehouse) {
            localStorage.setItem("selectedWarehouse", JSON.stringify(warehouse));
        } else {
            localStorage.removeItem("selectedWarehouse");
        }
    };

    return (
        <GodownContext.Provider value={{
            selectedWarehouse,
            setSelectedWarehouse: updateSelectedWarehouse,
            isLoading
        }}>
            {children}
        </GodownContext.Provider>
    );
}

export function useGodown() {
    const context = useContext(GodownContext);
    if (context === undefined) {
        throw new Error("useGodown must be used within a GodownProvider");
    }
    return context;
}
