"use client";

import { useState, useEffect } from "react";
import { Plus, Truck, User, Loader2, Trash2 } from "lucide-react";
import { useGodown } from "@/components/GodownProvider";
import axios from "axios";
import clsx from "clsx";

interface Vehicle {
    id: string;
    number: string;
    driverName: string;
    status: string;
}

export default function VehiclesPage() {
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [number, setNumber] = useState("");
    const [driver, setDriver] = useState("");

    useEffect(() => {
        if (selectedWarehouse && !isWarehouseLoading) {
            fetchVehicles();
        }
    }, [selectedWarehouse, isWarehouseLoading]);

    async function fetchVehicles() {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/vehicles?warehouseId=${selectedWarehouse.id}`);
            setVehicles(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWarehouse) return;

        setAdding(true);
        try {
            await axios.post("/api/vehicles", {
                number,
                driverName: driver,
                warehouseId: selectedWarehouse.id
            });

            setNumber("");
            setDriver("");
            fetchVehicles();
        } catch (e: any) {
            console.error(e);
            alert("Failed to add vehicle");
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to remove this vehicle?")) return;
        setDeletingId(id);
        try {
            await axios.delete(`/api/vehicles/${id}`);
            fetchVehicles();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to delete vehicle");
        } finally {
            setDeletingId(null);
        }
    }

    if (isWarehouseLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
    if (!selectedWarehouse) return <div className="p-8">Please select a warehouse.</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white font-space-grotesk tracking-tighter uppercase grayscale hover:grayscale-0 transition-all cursor-default">
                        Fleet <span className="text-ruby-500 opacity-50">/</span> Monitoring
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-ruby-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> Active Operations Hub
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Vehicle Inventory List */}
                <div className="lg:col-span-8 space-y-6">
                    {loading ? (
                        <div className="flex justify-center p-20 glass-card rounded-[2.5rem] border-white/5 bg-white/[0.01]">
                            <Loader2 className="w-10 h-10 animate-spin text-ruby-500 opacity-20" />
                        </div>
                    ) : !Array.isArray(vehicles) || vehicles.length === 0 ? (
                        <div className="text-center py-24 glass-card rounded-[3rem] border-white/5 border-dashed bg-white/[0.01]">
                            <Truck className="w-16 h-16 text-gray-800 mx-auto mb-6 opacity-20" />
                            <h3 className="text-xl font-black text-white font-space-grotesk uppercase tracking-tight">Fleet Grid Offline</h3>
                            <p className="text-gray-600 mt-2 font-medium">No transport assets registered in {selectedWarehouse.name} sector.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vehicles.map((v) => (
                                <div key={v.id} className="glass-card p-8 rounded-[2.5rem] border-white/5 hover:border-ruby-500/20 transition-all group relative overflow-hidden bg-white/[0.01] hover:bg-white/[0.03]">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4">
                                        <Truck className="w-32 h-32 text-ruby-100" />
                                    </div>
                                    
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="space-y-4">
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 group-hover:bg-ruby-950/30 group-hover:text-ruby-200 transition-all">
                                                <Truck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white font-space-grotesk tracking-tight uppercase group-hover:text-ruby-100 transition-colors">
                                                    {v.number}
                                                </h3>
                                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                                                    <User className="w-3 h-3 text-ruby-500/50" /> {v.driverName}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3">
                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                v.status === "AVAILABLE" ? "bg-emerald-950/30 text-emerald-100 border-emerald-500/20" : "bg-ruby-950/30 text-ruby-100 border-ruby-500/20"
                                            )}>
                                                {v.status}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(v.id)}
                                                disabled={deletingId === v.id}
                                                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-ruby-200 hover:bg-ruby-950/40 rounded-xl transition-all border border-transparent hover:border-ruby-500/20"
                                            >
                                                {deletingId === v.id ? <Loader2 className="w-4 h-4 animate-spin text-ruby-200" /> : <Trash2 className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Provisioning Form */}
                <div className="lg:col-span-4 sticky top-8">
                    <div className="glass-card p-10 rounded-[2.5rem] border-white/10 shadow-2xl bg-white/[0.02] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ruby-500/50 to-transparent"></div>
                        
                        <h2 className="text-xl font-black text-white font-space-grotesk tracking-tight uppercase mb-8 flex items-center gap-3">
                            <Plus className="w-5 h-5 text-ruby-400" />
                            Provision Asset
                        </h2>

                        <form onSubmit={handleAdd} className="space-y-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-ruby-100 mb-3 uppercase tracking-widest italic opacity-50">Registration Mark</label>
                                    <input
                                        value={number}
                                        onChange={(e) => setNumber(e.target.value)}
                                        required
                                        className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-ruby-100/30 outline-none transition-all placeholder-gray-700"
                                        placeholder="e.g. KA-05-AB-1234"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-ruby-100 mb-3 uppercase tracking-widest italic opacity-50">Designated Operator</label>
                                    <input
                                        value={driver}
                                        onChange={(e) => setDriver(e.target.value)}
                                        required
                                        className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-ruby-100/30 outline-none transition-all placeholder-gray-700"
                                        placeholder="Full legal name"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={adding}
                                className="w-full py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-ruby-950 bg-ruby-100 hover:bg-white glow-ruby active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {adding ? "Integrating Core..." : "Initialize Transport"}
                            </button>
                        </form>

                        <div className="mt-10 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-4 group/info">
                                <div className="w-8 h-8 rounded-lg bg-ruby-950/30 flex items-center justify-center text-ruby-300">
                                    <Truck className="w-4 h-4" />
                                </div>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                                    All vehicle data is synced with the <span className="text-ruby-200">Emerald Vault Logistics</span> network.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
