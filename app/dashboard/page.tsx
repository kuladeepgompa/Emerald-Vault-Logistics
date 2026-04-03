import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { Package, Truck, Receipt, MoreHorizontal, ArrowRight, TrendingUp, Clock, AlertTriangle, ShieldCheck, Zap, Activity } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import DashboardHeader from "@/components/DashboardHeader";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

async function getData(warehouseId: string, dateFilter?: string) {
    const db = await getDb();
    const wId = new ObjectId(warehouseId);

    const dateQuery = dateFilter ? {
        $gte: new Date(dateFilter),
        $lt: new Date(new Date(dateFilter).getTime() + 24 * 60 * 60 * 1000)
    } : undefined;

    const baseQuery = { warehouseId: wId };
    const tripQuery: any = {
        warehouseId: wId,
        ...(dateFilter ? { startTime: dateQuery } : { status: { $ne: "VERIFIED" } })
    };
    const verifiedTripsQuery: any = {
        warehouseId: wId,
        status: "VERIFIED",
        ...(dateFilter ? { endTime: dateQuery } : {})
    };
    const billQuery: any = {
        warehouseId: wId,
        ...(dateFilter ? { generatedAt: dateQuery } : {})
    };
    const activityQuery: any = {
        warehouseId: wId,
        ...(dateFilter ? { updatedAt: dateQuery } : {})
    };
    const lowStockQuery: any = {
        warehouseId: wId,
        quantity: { $lt: 20 }
    };

    const [productStock, tripMetricCount, verifiedTripsCount, billCount, lowStockCount, recentTrips, warehouse] = await Promise.all([
        db.collection("Product").aggregate([
            { $match: baseQuery },
            { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]).toArray(),
        db.collection("Trip").countDocuments(tripQuery),
        db.collection("Trip").countDocuments(verifiedTripsQuery),
        db.collection("Bill").countDocuments(billQuery),
        db.collection("Product").countDocuments(lowStockQuery),
        db.collection("Trip")
            .find(activityQuery)
            .sort({ updatedAt: -1 })
            .limit(dateFilter ? 50 : 5)
            .toArray(),
        db.collection("Warehouse").findOne({ _id: wId })
    ]);

    const vehicleIds = Array.from(new Set(recentTrips.map(t => t.vehicleId)));
    const vehicles = await db.collection("Vehicle").find({ _id: { $in: vehicleIds } }).toArray();
    const vehicleMap = new Map(vehicles.map(v => [v._id.toString(), v]));

    const formattedRecentTrips = recentTrips.map(t => ({
        ...t,
        id: t._id.toString(),
        _id: undefined,
        vehicle: vehicleMap.get(t.vehicleId.toString()) ? {
            ...vehicleMap.get(t.vehicleId.toString()),
            id: t.vehicleId.toString()
        } : null
    }));

    return {
        warehouseName: warehouse?.name || "Warehouse",
        productCount: productStock[0]?.total || 0,
        tripMetricCount,
        verifiedTripsCount,
        billCount,
        lowStockCount,
        recentTrips: formattedRecentTrips || [],
        isFiltered: !!dateFilter
    };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const warehouseId = cookieStore.get("warehouseId")?.value;

    if (!session) redirect("/api/auth/signin");
    if (!warehouseId) redirect("/select-org");

    const resolvedParams = await searchParams;
    const dateFilter = resolvedParams?.date || undefined;
    const data = await getData(warehouseId, dateFilter);
    const user = session.user as any;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

    return (
        <div className="space-y-10">
            {/* Header Section - Premium User Control Suite */}
            <DashboardHeader warehouseName={data.warehouseName} />

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard
                    title="Inventory Volume"
                    value={data.productCount.toLocaleString()}
                    icon={Package}
                    trend="Steady Growth"
                    color="emerald"
                />
                <StatCard
                    title={data.isFiltered ? "Active Logistics" : "Fleet Deployment"}
                    value={data.tripMetricCount.toString()}
                    icon={Truck}
                    subtitle={data.isFiltered ? "Trips initiated" : "Vehicles currently deployed"}
                    color="emerald"
                />
                <StatCard
                    title="Revenue Tokens"
                    value={data.billCount.toString()}
                    icon={Receipt}
                    color="ruby"
                    subtitle="Verified in-network"
                />
                <div className="glass-card p-8 rounded-3xl flex flex-col justify-between group hover:bg-white/[0.03] transition-all">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-ruby-950/30 text-ruby-200 group-hover:glow-ruby transition-all">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest font-space-grotesk">Attention Required</span>
                        </div>
                        <div className="text-4xl font-bold font-space-grotesk text-white tabular-nums">{data.lowStockCount}</div>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Critical stock tiers reached</p>
                    </div>
                    <Link href="/stock" className="text-sm font-bold text-ruby-200 mt-8 flex items-center gap-2 group-hover:gap-3 transition-all">
                        Initiate Restock <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Global Activity Feed (8/12) */}
                <div className="xl:col-span-8 glass-card p-10 rounded-3xl">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h2 className="text-2xl font-bold font-space-grotesk text-white">Logistics Feed</h2>
                            <p className="text-sm text-gray-500 mt-1">Real-time terminal telemetry monitoring</p>
                        </div>
                        <Link href="/trips" className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-400">
                            <MoreHorizontal className="w-6 h-6" />
                        </Link>
                    </div>

                    <div className="space-y-6">
                        {!data.recentTrips?.length ? (
                            <div className="text-center py-20 text-gray-600 font-medium italic border-2 border-dashed border-white/5 rounded-3xl">
                                No logged activity in this terminal sector.
                            </div>
                        ) : (
                            data.recentTrips.map((trip: any) => (
                                <div key={trip.id} className="flex items-center justify-between group p-6 glass-card bg-midnight/30 border-transparent hover:border-emerald-100/10 hover:bg-midnight/50 transition-all cursor-pointer rounded-2xl">
                                    <div className="flex items-center gap-6">
                                        <div className={clsx("p-4 rounded-2xl transition-all", {
                                            "bg-ruby-950/30 text-ruby-200 group-hover:glow-ruby": trip.status === "LOADED",
                                            "bg-emerald-900/30 text-emerald-100 group-hover:glow-emerald": trip.status === "VERIFIED",
                                            "bg-blue-900/30 text-blue-200 group-hover:shadow-[0_0_15px_-2px_rgba(59,130,246,0.5)]": trip.status === "RETURNED"
                                        })}>
                                            <Truck className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold font-space-grotesk text-white">{trip.vehicle?.number || "DR-774"}</h4>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 font-medium italic">
                                                <span className="text-gray-300 not-italic">{trip.vehicle?.driverName}</span>
                                                <span className="w-1.5 h-1.5 bg-white/10 rounded-full"></span>
                                                {trip.loadedItems.length} Assets Loaded
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={clsx("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm", {
                                            "bg-ruby-950/20 text-ruby-200 border-ruby-900/30": trip.status === "LOADED",
                                            "bg-emerald-900/20 text-emerald-100 border-emerald-800/30": trip.status === "VERIFIED",
                                            "bg-blue-900/20 text-blue-200 border-blue-800/30": trip.status === "RETURNED"
                                        })}>
                                            {trip.status === "LOADED" ? "In Transit" : trip.status}
                                        </span>
                                        <p className="text-xs font-mono text-gray-600 mt-3 flex items-center justify-end gap-2">
                                            <Clock className="w-3 h-3" />
                                            {new Date(trip.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 flex justify-center">
                        <Link href="/trips" className="text-emerald-100/50 hover:text-emerald-100 font-bold text-sm tracking-widest uppercase flex items-center gap-3 transition-all group">
                            Terminal Archive <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Right Sidebar Status (4/12) */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="glass-card p-10 rounded-3xl bg-gradient-to-br from-emerald-950/20 to-midnight relative overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-emerald-100/5 rounded-full blur-[80px] group-hover:bg-emerald-100/10 transition-all"></div>
                        <h3 className="text-xl font-bold font-space-grotesk text-white mb-10 flex items-center gap-3">
                            <Activity className="w-5 h-5 text-emerald-100" /> System Core
                        </h3>

                        <div className="space-y-8 relative z-10">
                            <StatusItem label="Database Grid" status="Operational" />
                            <StatusItem label="Satellite Sync" status="Operational" />
                            <StatusItem label="Backup Array" status="Synced" delay="2m ago" />
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-3 text-emerald-100/30">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Verified Secure Protocol</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-10 rounded-3xl border-emerald-900/10">
                        <h3 className="text-xl font-bold font-space-grotesk text-white mb-8">Quick Deploy</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/trips/new" className="glass-card bg-emerald-900/20 p-6 rounded-2xl text-center group hover:scale-105 transition-all">
                                <div className="bg-emerald-100 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-950 glow-emerald">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold text-white uppercase tracking-widest">New Manifest</span>
                            </Link>
                            <Link href="/bills" className="glass-card bg-ruby-950/20 p-6 rounded-2xl text-center group hover:scale-105 transition-all">
                                <div className="bg-ruby-200 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-ruby-950 glow-ruby">
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold text-white uppercase tracking-widest">Ledgers</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, subtitle, trend, color }: any) {
    return (
        <div className="glass-card p-8 rounded-3xl group hover:bg-white/[0.03] transition-all">
            <div className="flex justify-between items-start mb-8">
                <div className={clsx("p-4 rounded-2xl transition-all", {
                    "bg-emerald-900/30 text-emerald-100 group-hover:glow-emerald": color === "emerald",
                    "bg-ruby-950/30 text-ruby-200 group-hover:glow-ruby": color === "ruby",
                })}>
                    <Icon className="w-7 h-7" />
                </div>
                {trend && (
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-100 bg-emerald-100/10 px-3 py-1.5 rounded-full border border-emerald-100/10">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest font-space-grotesk mb-3">{title}</p>
                <h3 className="text-4xl font-bold font-space-grotesk text-white tabular-nums tracking-tighter">{value}</h3>
                {subtitle && <p className="text-xs text-gray-500 mt-3 font-medium italic opacity-60">{subtitle}</p>}
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StatusItem({ label, status, delay }: any) {
    return (
        <div className="flex justify-between items-center group/item cursor-default">
            <div className="flex flex-col">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">{label}</span>
                {delay && <span className="text-[10px] text-gray-600 font-mono mt-1">{delay}</span>}
            </div>
            <div className="flex items-center gap-3">
                <span className="text-white text-xs font-bold uppercase tracking-widest">{status}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-100 glow-emerald animate-pulse"></span>
            </div>
        </div>
    );
}
