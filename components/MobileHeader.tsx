"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck, ClipboardCheck, Receipt, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
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

export function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <div className="md:hidden">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 z-50 shadow-sm">
                <div className="flex items-center gap-2 text-ruby-700 font-bold text-xl">
                    <Package className="w-6 h-6" />
                    WMS
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-[60]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Sidebar Content */}
                    <aside className="absolute top-0 left-0 bottom-0 w-3/4 max-w-xs bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-ruby-700 flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Menu
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-900 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={clsx(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                                            isActive
                                                ? "bg-ruby-50 text-ruby-700"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        )}
                                    >
                                        <item.icon className={clsx("w-5 h-5", isActive ? "text-ruby-700" : "text-gray-400")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                Sign Out
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
