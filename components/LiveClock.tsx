"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function LiveClock() {
    const [time, setTime] = useState<string | null>(null);

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            });
            setTime(formatted);
        };

        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!time) return null; // Avoid hydration mismatch

    return (
        <div className="flex items-center gap-2 px-2 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black text-gray-400 dark:text-emerald-500 font-mono tabular-nums uppercase tracking-widest">
                {time}
            </span>
        </div>
    );
}
