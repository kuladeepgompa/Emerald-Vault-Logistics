"use client";

import { useState, useEffect, use } from "react";
import { Loader2, Printer, ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function InvoicePage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bill, setBill] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBill();
    }, [params.id]);

    const fetchBill = async () => {
        try {
            const res = await axios.get(`/api/bills/${params.id}`);
            setBill(res.data);
        } catch (error) {
            console.error("Failed to fetch bill", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!bill) return <div className="p-12 text-center text-red-500">Invoice not found</div>;

    const invoiceDate = new Date(bill.generatedAt).toLocaleDateString();

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-1000 print:max-w-none print:pb-0">
            {/* Action Bar */}
            <div className="print:hidden flex justify-between items-center mb-12">
                <Link
                    href="/bills"
                    className="w-12 h-12 glass-card flex items-center justify-center rounded-2xl text-gray-500 hover:text-emerald-100 hover:border-emerald-100/20 transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <button
                    onClick={() => window.print()}
                    className="bg-emerald-100 text-emerald-950 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white active:scale-95 transition-all shadow-xl glow-emerald"
                >
                    <Printer className="w-4 h-4" />
                    Archive Manifest
                </button>
            </div>

            {/* Digital Receipt Card */}
            <div className="glass-card p-16 rounded-[3rem] border-white/5 bg-white/[0.01] relative overflow-hidden shadow-2xl print:shadow-none print:border-none print:p-0 print:bg-white print:text-black">
                {/* Branding Logic */}
                <div className="absolute top-0 right-0 p-16 opacity-[0.02] print:hidden">
                    <Receipt className="w-80 h-80 text-emerald-100 translate-x-20 -translate-y-20 rotate-12" />
                </div>

                <div className="relative z-10">
                    {/* Invoice Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mb-20 border-b border-white/5 pb-12 print:border-black/10">
                        <div>
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Official Receipt</div>
                            <h1 className="text-6xl font-black text-white font-space-grotesk tracking-tighter uppercase print:text-black">
                                Invoice
                            </h1>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-4 font-mono">
                                REGISTRY_ID: <span className="text-gray-400">{bill.id.toUpperCase()}</span>
                            </p>
                        </div>
                        <div className="text-left md:text-right space-y-2">
                            <h2 className="text-2xl font-black text-white font-space-grotesk uppercase print:text-black">{bill.warehouse?.name || "EMERALD_VAULT"}</h2>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{bill.warehouse?.location || "Sector 7G Lattice"}</p>
                        </div>
                    </div>

                    {/* Metadata Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Asset Assignment / Billed To</p>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white font-space-grotesk uppercase print:text-black">{bill.trip?.vehicle?.driverName}</h3>
                                <p className="text-sm font-black text-emerald-500/50 uppercase tracking-widest font-mono">{bill.trip?.vehicle?.number}</p>
                            </div>
                        </div>
                        <div className="text-left md:text-right space-y-8">
                            <div>
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Temporal Marker</p>
                                <p className="text-lg font-black text-white font-mono print:text-black">{invoiceDate}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Authorization Authority</p>
                                <p className="text-[10px] font-black text-white uppercase tracking-widest print:text-black">{bill.generator?.name || "System_Root"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Itemized Manifest */}
                    <div className="mb-20 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.02] border-b border-white/5 print:bg-black/5 print:border-black/10">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Descriptor / Payload</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Qty</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Unit Val</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-white uppercase tracking-widest text-right print:text-black">Aggregated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 print:divide-black/10">
                                {Array.isArray(bill.trip?.loadedItems) && bill.trip.loadedItems.map((item: any, idx: number) => {
                                    const sold = item.qtyLoaded - (item.qtyReturned || 0);
                                    if (sold <= 0) return null;
                                    return (
                                        <tr key={idx} className="group transition-colors hover:bg-white/[0.01]">
                                            <td className="px-8 py-6">
                                                <div className="text-sm font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors print:text-black">
                                                    {item.productName}
                                                </div>
                                                <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1 font-mono">
                                                    {item.productSku}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right text-sm font-black text-gray-400 font-mono">
                                                {sold}
                                            </td>
                                            <td className="px-8 py-6 text-right text-sm font-black text-gray-400 font-mono">
                                                ₹{item.productPrice}
                                            </td>
                                            <td className="px-8 py-6 text-right text-lg font-black text-white font-space-grotesk tracking-tighter print:text-black">
                                                ₹{sold * item.productPrice}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex justify-end border-t border-white/5 pt-12 print:border-black/10">
                        <div className="w-full md:w-80 space-y-6">
                            <div className="flex justify-between items-center opacity-40">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest print:text-black">Subtotal Registry</span>
                                <span className="text-sm font-black text-white font-mono print:text-black">₹{bill.totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-6 border-y border-emerald-500/10 px-4 bg-emerald-500/[0.02] rounded-2xl print:bg-black/5 print:border-black/10">
                                <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">Total Value</span>
                                <span className="text-3xl font-black text-white font-space-grotesk tracking-tighter print:text-black">
                                    <span className="text-emerald-500 opacity-50 mr-1 tracking-normal">₹</span>
                                    {bill.totalAmount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Notes */}
                    <div className="mt-20 text-center opacity-20 group hover:opacity-50 transition-opacity">
                        <p className="text-[9px] font-black text-white uppercase tracking-[0.5em] print:text-black">
                            End of Manifest <span className="mx-4 italic">//</span> Authenticity Guaranteed
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
