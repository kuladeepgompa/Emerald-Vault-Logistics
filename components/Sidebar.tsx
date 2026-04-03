"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck, ClipboardCheck, Receipt, LayoutDashboard, LogOut, Building2 } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stock Management", href: "/stock", icon: Package },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Vehicle Loading", href: "/trips/new", icon: ClipboardCheck },
    { name: "Trips & Verification", href: "/trips", icon: ClipboardCheck },
    { name: "Billing", href: "/bills", icon: Receipt },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex w-72 h-screen flex-col sticky top-0 flex-shrink-0 z-40 p-4 border-r border-white/5 bg-midnight">
            <div className="glass-card mb-4 p-6 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center glow-emerald shrink-0">
                    <Package className="w-6 h-6 text-emerald-950" />
                </div>
                <div>
                   <h1 className="text-lg font-bold text-white font-space-grotesk tracking-tight leading-none">EMERALD</h1>
                   <span className="text-[10px] font-black text-emerald-100/50 uppercase tracking-[0.2em] leading-none">Vault Logistics</span>
                </div>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto px-1 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all text-sm font-bold tracking-tight whitespace-nowrap group relative overflow-hidden",
                                isActive
                                    ? "bg-emerald-100 text-emerald-950 glow-emerald"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-emerald-950 rounded-full" />
                            )}
                            <item.icon className={clsx("w-5 h-5 flex-shrink-0 transition-all", isActive ? "text-emerald-950" : "text-gray-600 group-hover:text-emerald-100")} />
                            <span className="truncate">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="pt-4 mt-4 border-t border-white/5 space-y-2 px-1 pb-4">
                <Link
                    href="/select-org"
                    className="flex items-center gap-4 px-5 py-3.5 w-full text-left text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all group"
                >
                    <Building2 className="w-5 h-5 text-gray-600 group-hover:text-emerald-100" />
                    <span>Switch Terminal</span>
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-4 px-5 py-3.5 w-full text-left text-sm font-bold text-gray-500 hover:text-ruby-200 hover:bg-ruby-950/20 rounded-2xl transition-all group"
                >
                    <LogOut className="w-5 h-5 text-gray-600 group-hover:text-ruby-200" />
                    <span>Terminate Session</span>
                </button>
            </div>
        </aside>
    );
}
