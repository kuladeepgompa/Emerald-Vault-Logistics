"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { 
    LogOut, Settings, Building2, User, 
    ChevronDown, Package, Clock, Calendar 
} from "lucide-react";
import Link from "next/link";
import LiveClock from "./LiveClock";
import DashboardDateFilter from "./DashboardDateFilter";
import clsx from "clsx";

interface DashboardHeaderProps {
    warehouseName: string;
}

export default function DashboardHeader({ warehouseName }: DashboardHeaderProps) {
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const user = session?.user as any;

    return (
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 glass-card p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-700">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-1.5 h-8 bg-emerald-500 rounded-full glow-emerald"></div>
                    <h1 className="text-4xl font-black font-space-grotesk tracking-tighter text-foreground uppercase">
                        {warehouseName} <span className="text-emerald-500/30 font-light mx-2">/</span> <span className="text-emerald-500">Ops Console</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                        System Status: 
                        <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] glow-emerald">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Operational
                        </span>
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 relative z-10 w-full xl:w-auto">
                {/* Temporal & Filters Matrix */}
                <div className="flex items-center gap-3 bg-white/[0.02] dark:bg-black/20 p-2 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-2 px-6 border-r border-white/5 py-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] font-black font-mono tracking-widest text-emerald-500">
                            <LiveClock />
                        </span>
                    </div>
                    <div className="px-4 py-2">
                        <DashboardDateFilter />
                    </div>
                </div>

                {/* User Control Suite (Emerald Matrix) */}
                <div className="flex items-center gap-2 p-1.5 bg-white/[0.01] rounded-3xl border border-white/5 shadow-2xl relative">
                    {/* Terminal Switcher */}
                    <Link
                        href="/select-org"
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-emerald-500 transition-all active:scale-90 border border-white/5 group"
                        title="Switch Terminal"
                    >
                        <Building2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </Link>

                    {/* User Identity Matrix */}
                    <div className="flex items-center gap-3 pl-4 pr-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/10 group cursor-pointer hover:bg-emerald-500/20 transition-all relative overflow-hidden"
                         onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-emerald-950 font-black text-sm glow-emerald">
                            {user?.name?.[0] || <User className="w-4 h-4" />}
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-0.5">
                                {user?.role || "Staff"}
                            </div>
                            <div className="text-sm font-black text-foreground uppercase tracking-tight leading-none truncate max-w-[120px]">
                                {user?.name?.split(" ")[0]}
                            </div>
                        </div>
                        <ChevronDown className={clsx("w-4 h-4 text-emerald-500 transition-transform", isUserMenuOpen && "rotate-180")} />

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-4 w-64 glass-card p-4 rounded-3xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                                <div className="p-4 mb-2 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Authenticated Email</p>
                                    <p className="text-xs font-bold text-foreground truncate">{user?.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <button className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-white/5 text-sm font-bold text-gray-500 hover:text-emerald-500 transition-all border border-transparent hover:border-emerald-500/10 group">
                                        <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                                        Settings Matrix
                                    </button>
                                    <button 
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-ruby-950/20 text-sm font-bold text-gray-500 hover:text-ruby-200 transition-all border border-transparent hover:border-ruby-900/30 group">
                                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        Terminate Session
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
