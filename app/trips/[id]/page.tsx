"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Truck, PackageCheck, AlertCircle, Save, CheckCircle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import axios from "axios";

export default function TripDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params); // Unwrap params
    const router = useRouter();
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    // State for returns: { productId: qtyReturned }
    const [returns, setReturns] = useState<Record<string, number | string>>({});

    useEffect(() => {
        fetchTrip();
    }, [params.id]);

    const fetchTrip = async () => {
        try {
            const res = await axios.get(`/api/trips/${params.id}`);
            const data = res.data || {};
            setTrip(data);

            // Initialize returns with 0 (or existing if verified?)
            const initialReturns: Record<string, number> = {};
            const loadedItems = Array.isArray(data.loadedItems) ? data.loadedItems : [];

            if (data.status === "VERIFIED") {
                // If Verified, show what was returned
                loadedItems.forEach((item: any) => {
                    initialReturns[item.productId] = item.qtyReturned || 0;
                });
            } else {
                // Pending verification, default to 0
                loadedItems.forEach((item: any) => {
                    initialReturns[item.productId] = 0;
                });
            }
            setReturns(initialReturns);
        } catch (error) {
            console.error("Failed to fetch trip", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnChange = (productId: string, val: string) => {
        if (val === "") {
            setReturns(prev => ({ ...prev, [productId]: "" }));
            return;
        }
        const qty = parseInt(val);
        if (isNaN(qty)) return;
        setReturns(prev => ({ ...prev, [productId]: qty }));
    };

    const handleVerify = async () => {
        if (!confirm("Confirm trip verification? This will finalize the trip and update stock.")) return;

        setVerifying(true);
        try {
            const returnedItems = Object.entries(returns).map(([productId, qtyReturned]) => ({
                productId,
                qtyReturned
            }));

            await axios.patch(`/api/trips/${params.id}`, {
                status: "VERIFIED",
                returnedItems
            });

            alert("Trip verified successfully!");
            fetchTrip();
        } catch (error: any) {
            alert(error.response?.data?.error || "Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!trip) return <div className="p-12 text-center text-red-500">Trip not found</div>;

    const isVerified = trip.status === "VERIFIED";

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-6">
                <Link
                    href="/trips"
                    className="w-12 h-12 glass-card flex items-center justify-center rounded-2xl text-gray-400 hover:text-emerald-100 hover:border-emerald-100/20 transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black text-white font-space-grotesk tracking-tighter uppercase grayscale hover:grayscale-0 transition-all cursor-default">
                            Trip <span className="text-emerald-500 opacity-50">/</span> Telemetry
                        </h1>
                        <span className={clsx(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                            {
                                "bg-amber-950/30 text-amber-500 border-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.1)]": trip.status === "LOADED",
                                "bg-emerald-950/30 text-emerald-500 border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]": trip.status === "VERIFIED",
                            }
                        )}>
                            {trip.status === "LOADED" ? "IN_TRANSIT" : trip.status}
                        </span>
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">
                        Deployment ID: <span className="font-mono text-gray-500">{trip.id.substring(0, 8)}...</span>
                    </p>
                </div>
            </div>

            {/* Asset Monitoring Card */}
            <div className="glass-card p-10 rounded-[2.5rem] border-white/5 bg-white/[0.01] overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-8 -translate-y-8">
                    <Truck className="w-64 h-64 text-emerald-100" />
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-emerald-950/30 border border-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                            <Truck className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white font-space-grotesk tracking-tight uppercase">{trip.vehicle?.number || "VOID_ASSET"}</h3>
                            <p className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mt-1 italic">{trip.vehicle?.driverName}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-12">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Initialization</p>
                            <p className="text-sm font-black text-white font-mono">{new Date(trip.startTime).toLocaleDateString()} <span className="text-gray-700 ml-1">{new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                        </div>
                        {trip.endTime && (
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Finalization</p>
                                <p className="text-sm font-black text-emerald-500 font-mono">{new Date(trip.endTime).toLocaleDateString()} <span className="opacity-50 ml-1">{new Date(trip.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Verification Console */}
            <div className="glass-card rounded-[2.5rem] border-white/5 bg-white/[0.01] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white font-space-grotesk tracking-tight uppercase flex items-center gap-3">
                        <PackageCheck className="w-5 h-5 text-emerald-500" />
                        Payload Verification
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Lattice Node / Product</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Manifest Qty</th>
                                <th className="px-8 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-right bg-emerald-500/5">Discharged</th>
                                <th className="px-8 py-5 text-[10px] font-black text-ruby-400 uppercase tracking-widest text-right">Inflow Return</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {Array.isArray(trip.loadedItems) && trip.loadedItems.map((item: any) => {
                                const returned = returns[item.productId] === "" ? 0 : Number(returns[item.productId] || 0);
                                const loaded = item.qtyLoaded;
                                const sold = loaded - returned;

                                return (
                                    <tr key={item.productId} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-black text-white uppercase tracking-tight group-hover:text-emerald-100 transition-colors">
                                                {item.product?.name || "VOID_PRODUCT"}
                                            </div>
                                            <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">
                                                {item.product?.pack} <span className="opacity-20 mx-1">•</span> {item.product?.flavour}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right text-sm font-black text-white font-mono opacity-60">
                                            {loaded}
                                        </td>
                                        <td className="px-8 py-6 text-right text-lg font-black text-emerald-500 font-space-grotesk bg-emerald-500/[0.02]">
                                            {sold}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {isVerified ? (
                                                <span className="text-lg font-black text-ruby-400 font-space-grotesk">{item.qtyReturned}</span>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={loaded}
                                                        value={returns[item.productId] ?? ""}
                                                        onChange={(e) => handleReturnChange(item.productId, e.target.value)}
                                                        className="w-24 bg-midnight/50 border border-white/5 rounded-2xl px-4 py-3 text-right font-black text-ruby-400 focus:border-ruby-500/30 outline-none transition-all placeholder-gray-800"
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {!isVerified && (
                    <div className="p-10 bg-white/[0.02] border-t border-white/5 flex justify-end">
                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="bg-emerald-100 text-emerald-950 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] glow-emerald hover:bg-white active:scale-95 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale"
                        >
                            {verifying ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-950" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-4 h-4" />
                                    Synchronize Verification
                                </div>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Verification Disclaimer */}
            <div className="flex items-center gap-4 px-10 opacity-30">
                <AlertCircle className="w-4 h-4 text-emerald-500" />
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                    Verification finalizes inventory redistribution from transport asset to warehouse lattice nodes.
                </p>
            </div>
        </div>
    );
}
