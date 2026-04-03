"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

export default function DashboardDateFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Default to today if no param, or use param
    const initialDate = searchParams.get("date") || new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(initialDate);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDate(newDate);
        if (newDate) {
            router.push(`/dashboard?date=${newDate}`);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex items-center gap-2 bg-transparent transition-colors group">
            <Calendar className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-500 transition-colors" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest hidden sm:inline">Temporal Marker:</span>
            <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="text-[11px] font-black text-foreground bg-transparent border-none focus:ring-0 p-0 cursor-pointer uppercase tracking-widest"
            />
        </div>
    );
}
