"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Truck, CheckCircle, MapPin, AlertCircle, Package, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { useGodown } from "@/components/GodownProvider";
import axios from "axios";

interface Trip {
    id: string;
    status: string;
    startTime: string;
    endTime?: string;
    vehicle: {
        number: string;
    };
    loadedItems: any[];
}

export default function TripsPage() {
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedWarehouse && !isWarehouseLoading) {
            fetchTrips();
        }
    }, [selectedWarehouse, isWarehouseLoading]);

    const fetchTrips = async () => {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/trips?warehouseId=${selectedWarehouse.id}`);
            setTrips(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch trips", error);
            setTrips([]);
        } finally {
            setLoading(false);
        }
    };

    if (isWarehouseLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!selectedWarehouse) return <div className="p-8 text-center text-gray-500">Select a warehouse to view trips.</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white font-space-grotesk tracking-tighter uppercase grayscale hover:grayscale-0 transition-all cursor-default">
                        Logistics <span className="text-emerald-500 opacity-50">/</span> Matrix
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Active Deployment Grid
                    </p>
                </div>
                <Link
                    href="/trips/new"
                    className="group flex items-center gap-3 bg-emerald-100 text-emerald-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest glow-emerald hover:bg-white transition-all shadow-2xl active:scale-95"
                >
                    <Truck className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    Initialize New Trip
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-32 glass-card rounded-[3rem] border-white/5 bg-white/[0.01]">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500 opacity-20" />
                </div>
            ) : !Array.isArray(trips) || trips.length === 0 ? (
                <div className="text-center py-32 glass-card rounded-[3rem] border-white/5 border-dashed bg-white/[0.01]">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Truck className="w-10 h-10 text-gray-700 opacity-30" />
                    </div>
                    <h3 className="text-2xl font-black text-white font-space-grotesk uppercase tracking-tight">Zero Active Deployments</h3>
                    <p className="text-gray-600 mt-2 font-medium">No transport logs matched for {selectedWarehouse.name} sector.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {Array.isArray(trips) && trips.map((trip) => (
                        <Link
                            href={`/trips/${trip.id}`}
                            key={trip.id}
                            className={clsx(
                                "glass-card p-8 rounded-[2.5rem] border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all group overflow-hidden relative",
                                {
                                    "hover:border-amber-500/20": trip.status === "LOADED",
                                    "hover:border-emerald-500/20": trip.status === "VERIFIED",
                                    "hover:border-blue-500/20": trip.status === "RETURNED"
                                }
                            )}
                        >
                            {/* Dynamic Background Glow */}
                            <div className={clsx("absolute top-0 left-0 w-1 h-full opacity-50", {
                                "bg-amber-500 shadow-[2px_0_15px_rgba(245,158,11,0.3)]": trip.status === "LOADED",
                                "bg-emerald-500 shadow-[2px_0_15px_rgba(16,185,129,0.3)]": trip.status === "VERIFIED",
                                "bg-blue-500 shadow-[2px_0_15px_rgba(59,130,246,0.3)]": trip.status === "RETURNED"
                            })}></div>

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-8">
                                    <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-3", {
                                        "bg-amber-950/30 text-amber-500 border border-amber-500/10": trip.status === "LOADED",
                                        "bg-emerald-950/30 text-emerald-500 border border-emerald-500/10": trip.status === "VERIFIED",
                                        "bg-blue-950/30 text-blue-500 border border-blue-500/10": trip.status === "RETURNED"
                                    })}>
                                        {trip.status === "VERIFIED" ? <CheckCircle className="w-7 h-7" /> : <Truck className="w-7 h-7" />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white font-space-grotesk tracking-tight uppercase group-hover:text-white/90 transition-colors">
                                            {trip.vehicle?.number || "VOID_ASSET"}
                                        </h3>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-3 mt-2">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3 opacity-50" />
                                                {trip.status === "VERIFIED" && trip.endTime
                                                    ? `Finalized: ${new Date(trip.endTime).toLocaleDateString()}`
                                                    : `Initialized: ${new Date(trip.startTime).toLocaleDateString()}`
                                                }
                                            </span>
                                            <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
                                            <span className="flex items-center gap-1.5">
                                                <Package className="w-3 h-3 opacity-50" />
                                                {Array.isArray(trip.loadedItems) ? trip.loadedItems.length : 0} Payload Units
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-10">
                                    <div className="text-right space-y-1">
                                        <p className="text-[9px] font-black uppercase text-gray-600 tracking-[0.2em] italic">Logistics Status</p>
                                        <p className={clsx("font-black text-sm uppercase tracking-widest", {
                                            "text-amber-500": trip.status === "LOADED",
                                            "text-emerald-500": trip.status === "VERIFIED",
                                            "text-blue-500": trip.status === "RETURNED"
                                        })}>
                                            {trip.status === "LOADED" ? "IN_TRANSIT" : trip.status}
                                        </p>
                                    </div>
                                    {trip.status === "LOADED" ? (
                                        <div className="w-12 h-12 bg-amber-500/5 rounded-full flex items-center justify-center border border-amber-500/20">
                                            <AlertCircle className="text-amber-500 w-6 h-6 animate-pulse" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5 opacity-20 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="text-white w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
