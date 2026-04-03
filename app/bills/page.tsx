"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Receipt, CheckCircle, ArrowRight } from "lucide-react";
import { useGodown } from "@/components/GodownProvider";
import axios from "axios";
import clsx from "clsx";

export default function BillsPage() {
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bills, setBills] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingTrips, setPendingTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<string>("ALL");

    // Manage invoice dates for pending items
    const [dates, setDates] = useState<Record<string, string>>({});

    useEffect(() => {
        if (selectedWarehouse && !isWarehouseLoading) {
            fetchData();
        }
    }, [selectedWarehouse, isWarehouseLoading]);

    const fetchData = async () => {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            // New API returns { bills, pendingTrips }
            const res = await axios.get(`/api/bills?warehouseId=${selectedWarehouse.id}`);
            const { bills = [], pendingTrips = [] } = res.data || {};

            setBills(Array.isArray(bills) ? bills : []);
            setPendingTrips(Array.isArray(pendingTrips) ? pendingTrips : []);

            // Initialize dates
            const initialDates: Record<string, string> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Array.isArray(pendingTrips) ? pendingTrips : []).forEach((t: any) => {
                initialDates[t.id] = new Date().toISOString().split('T')[0];
            });
            setDates(initialDates);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const generateBill = async (tripId: string) => {
        if (!confirm("Generate Invoice for this trip?")) return;
        setGenerating(tripId);
        try {
            await axios.post("/api/bills", {
                tripId,
                date: dates[tripId]
            });
            fetchData(); // Refresh list
        } catch (e: any) {
            alert(e.response?.data?.error || "Failed to generate bill");
        } finally {
            setGenerating("");
        }
    };

    // FILTER LOGIC
    const filteredBills = bills.filter(bill => {
        const matchesSearch = bill.trip?.vehicle?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.id.toLowerCase().includes(searchTerm.toLowerCase());

        const billDate = new Date(bill.generatedAt).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        let matchesDate = true;
        if (dateFilter === "TODAY") {
            matchesDate = billDate === today;
        } else if (dateFilter !== "ALL") {
            matchesDate = billDate === dateFilter;
        }

        return matchesSearch && matchesDate;
    });

    // SUMMARY STATS CALCULATION
    let summaryBills = bills;
    let periodLabel = "All Time";

    if (dateFilter === "TODAY") {
        const today = new Date().toISOString().split('T')[0];
        summaryBills = bills.filter(bill => new Date(bill.generatedAt).toISOString().split('T')[0] === today);
        periodLabel = "Today";
    } else if (dateFilter !== "ALL") {
        summaryBills = bills.filter(bill => new Date(bill.generatedAt).toISOString().split('T')[0] === dateFilter);
        periodLabel = new Date(dateFilter).toLocaleDateString();
    }

    const summaryTotal = summaryBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

    // Group by vehicle
    const vehicleStats = summaryBills.reduce((acc, bill) => {
        const vehicleNum = bill.trip?.vehicle?.number || "Unknown";
        acc[vehicleNum] = (acc[vehicleNum] || 0) + (bill.totalAmount || 0);
        return acc;
    }, {} as Record<string, number>);

    if (isWarehouseLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!selectedWarehouse) return <div className="p-8 text-center text-gray-500">Select a warehouse to view billing.</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white font-space-grotesk tracking-tighter uppercase grayscale hover:grayscale-0 transition-all cursor-default">
                        Financial <span className="text-emerald-500 opacity-50">/</span> Matrix
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Fiscal Node Synchronized
                    </p>
                </div>
            </div>

            {/* Premium Summary Intelligence */}
            <div className="glass-card p-10 rounded-[3rem] border-white/5 bg-white/[0.01] relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-12 -translate-y-12 rotate-12">
                    <Receipt className="w-80 h-80 text-emerald-100" />
                </div>
                
                <div className="flex flex-col lg:flex-row justify-between gap-12 relative z-10">
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.3em] italic">Total Revenue Ledger <span className="text-white/20 mx-2">//</span> {periodLabel}</h2>
                        <div className="text-6xl font-black text-white font-space-grotesk tracking-tighter flex items-baseline gap-2">
                            <span className="text-emerald-500 tracking-normal opacity-50">₹</span>
                            {summaryTotal.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-[9px] font-black text-emerald-100 uppercase tracking-widest">
                                {summaryBills.length} Active Records
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 lg:max-w-xl">
                        <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Asset Efficiency Breakdown</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                            {Object.entries(vehicleStats).map(([vehicle, amount]) => (
                                <div key={vehicle} className="glass-card p-5 rounded-2xl border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        {vehicle}
                                    </div>
                                    <div className="text-xl font-black text-white font-space-grotesk">₹{Number(amount).toLocaleString()}</div>
                                </div>
                            ))}
                            {summaryBills.length === 0 && (
                                <div className="text-gray-600 text-[10px] font-black uppercase tracking-widest italic py-8 border border-dashed border-white/5 rounded-2xl text-center col-span-full">
                                    No financial telemetry for this sector
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Verification Grid */}
            <div className="space-y-6">
                <h2 className="text-lg font-black text-white font-space-grotesk tracking-tight uppercase flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Pending Finalization
                </h2>
                
                {loading ? (
                    <div className="flex justify-center p-20 glass-card rounded-[2.5rem] border-white/5 bg-white/[0.01]">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 opacity-20" />
                    </div>
                ) : !Array.isArray(pendingTrips) || pendingTrips.length === 0 ? (
                    <div className="py-20 text-center glass-card rounded-[2.5rem] border-white/5 border-dashed bg-white/[0.01]">
                        <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Verification queue empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingTrips.map(trip => (
                            <div key={trip.id} className="glass-card p-8 rounded-[2.5rem] border-emerald-500/10 bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] transition-all group overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                                    <Receipt className="w-12 h-12 text-emerald-100" />
                                </div>
                                <div className="mb-8">
                                    <h3 className="text-xl font-black text-white font-space-grotesk tracking-tight uppercase">{trip.vehicle?.number || "VOID_ASSET"}</h3>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Verified: {new Date(trip.endTime).toLocaleDateString()}</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest block mb-2">Invoice Timestamp</label>
                                        <input
                                            type="date"
                                            value={dates[trip.id] || ""}
                                            onChange={(e) => setDates({ ...dates, [trip.id]: e.target.value })}
                                            className="w-full bg-midnight/50 border border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-white focus:border-emerald-500/30 outline-none transition-all"
                                        />
                                    </div>

                                    <button
                                        onClick={() => generateBill(trip.id)}
                                        disabled={generating === trip.id}
                                        className="w-full bg-emerald-100 text-emerald-950 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] glow-emerald hover:bg-white active:scale-95 transition-all shadow-xl disabled:opacity-30 disabled:grayscale"
                                    >
                                        {generating === trip.id ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Commit Invoice"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Historical Ledger Section */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                    <h2 className="text-lg font-black text-white font-space-grotesk tracking-tight uppercase flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-emerald-500" />
                        Historical Ledger
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Filter registry..."
                            className="bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-3.5 text-xs font-black text-white placeholder-gray-700 focus:border-emerald-500/30 outline-none transition-all w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <div className="flex glass-card p-1 rounded-2xl items-center gap-1 border-white/5 border">
                            <button
                                onClick={() => setDateFilter("ALL")}
                                className={clsx("px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", dateFilter === "ALL" ? "bg-white text-emerald-950" : "text-gray-500 hover:text-white")}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setDateFilter("TODAY")}
                                className={clsx("px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", dateFilter === "TODAY" ? "bg-white text-emerald-950" : "text-gray-500 hover:text-white")}
                            >
                                Today
                            </button>
                            <div className="h-4 w-px bg-white/10 mx-2"></div>
                            <input
                                type="date"
                                value={dateFilter !== "ALL" && dateFilter !== "TODAY" ? dateFilter : ""}
                                onChange={(e) => setDateFilter(e.target.value || "ALL")}
                                className="bg-transparent text-[10px] font-black text-emerald-100 uppercase tracking-widest outline-none p-1 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-[2.5rem] border-white/5 bg-white/[0.01] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Entry Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Verification Node</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Asset Mark</th>
                                <th className="px-8 py-5 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest text-right">Alpha/Profit</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/50 uppercase tracking-widest text-right">Gross Valuation</th>
                                <th className="px-8 py-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={6} className="px-8 py-20 text-center"><Loader2 className="animate-spin inline text-emerald-500 opacity-20 w-10 h-10" /></td></tr>
                            ) : filteredBills.length === 0 ? (
                                <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-600 text-xs font-black uppercase tracking-widest">No matching financial records</td></tr>
                            ) : (
                                filteredBills.map(bill => (
                                    <tr key={bill.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6 text-[11px] font-black text-white font-mono">
                                            {new Date(bill.generatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                            {bill.trip?.endTime ? new Date(bill.trip.endTime).toLocaleDateString() : 'Pending Synchrony'}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-white font-space-grotesk group-hover:text-emerald-100 transition-all">
                                            {bill.trip?.vehicle?.number || "UNK_ASSET"}
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-emerald-500 font-mono tracking-tighter">
                                            ₹{(bill.totalProfit || 0).toFixed(2)}
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-white font-mono text-lg tracking-tighter">
                                            ₹{bill.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Link href={`/bills/${bill.id}`} className="w-10 h-10 glass-card flex items-center justify-center rounded-xl text-gray-600 hover:text-emerald-100 transition-all border border-transparent hover:border-emerald-500/20">
                                                <ArrowRight className="w-5 h-5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
