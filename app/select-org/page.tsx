"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package, Plus, ArrowRight, Building2, CheckCircle, LogOut, Users, Trash2, Pencil, Search } from "lucide-react";
import clsx from "clsx";
import axios from "axios";
import { useGodown } from "@/components/GodownProvider";

interface Warehouse {
    id: string;
    name: string;
    location: string;
}

interface AccessRequest {
    id: string;
    warehouseId: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        image?: string;
    };
    warehouse: {
        id: string;
        name: string;
    };
}

export default function WarehouseSelectPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { setSelectedWarehouse } = useGodown();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
    const [staffList, setStaffList] = useState<AccessRequest[]>([]);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [view, setView] = useState<"SELECT" | "CREATE" | "REQUESTS" | "STAFF">("SELECT");
    const [searchQuery, setSearchQuery] = useState("");

    // Form States
    const [newName, setNewName] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Staff States
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [editStaffEmail, setEditStaffEmail] = useState("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session?.user as any)?.role;

    // Redirect to login if unauthenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/api/auth/signin?callbackUrl=/select-org");
        }
    }, [status, router]);

    // Initial Fetch
    useEffect(() => {
        if (status === "authenticated") {
            fetchWarehouses();
            if (userRole === "ADMIN") {
                fetchRequests();
                fetchStaff();
            } else {
                fetchMyRequests();
            }
        }
    }, [status, userRole]);

    const fetchMyRequests = async () => {
        try {
            const res = await axios.get("/api/warehouse-access/my-requests");
            setMyRequests(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch my requests", error);
            setMyRequests([]);
        }
    }

    const fetchWarehouses = async () => {
        try {
            const res = await axios.get("/api/warehouses");
            const data = Array.isArray(res.data) ? res.data : [];
            setWarehouses(data);
            if (data.length === 0 && userRole === "ADMIN") {
                setView("CREATE");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await axios.get("/api/warehouse-access/requests");
            setPendingRequests(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await axios.get("/api/warehouse-access/staff");
            setStaffList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch staff", error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await axios.post("/api/warehouses", { name: newName, location: newLocation });
            await fetchWarehouses();
            setView("SELECT");
            setSelectedWarehouse({ ...res.data });
            // Set cookie
            document.cookie = `warehouseId=${res.data.id}; path=/; max-age=31536000`;
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to create warehouse", error);
            alert("Failed to create warehouse");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequest = async (warehouseId: string) => {
        setIsSubmitting(true);
        try {
            await axios.post("/api/warehouse-access/request", { warehouseId });
            alert("Access requested! Please wait for admin approval.");
            fetchMyRequests(); // Refresh status
        } catch (error: any) {
            console.error("Failed to request access", error);
            const msg = error.response?.data?.error || "Failed to request access.";
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (requestId: string, status: "APPROVED" | "REJECTED") => {
        try {
            await axios.put("/api/warehouse-access/approve", { requestId, status, role: "STAFF" });
            fetchRequests(); // Refresh list
            fetchStaff(); // Refresh staff list if approved/rejected
        } catch (error) {
            console.error("Failed to update request", error);
            alert("Failed to update request");
        }
    }

    const handleRemoveStaff = async (requestId: string) => {
        if (!confirm("Are you sure you want to remove this staff member?")) return;
        handleApprove(requestId, "REJECTED");
    };

    const handleDelete = async (warehouseId: string, warehouseName: string) => {
        if (!confirm(`Are you sure you want to delete "${warehouseName}"? This action cannot be undone and will delete all associated products.`)) return;

        try {
            await axios.delete(`/api/warehouses/${warehouseId}`);
            fetchWarehouses();
            // alert("Warehouse deleted successfully"); // Optional feedback
        } catch (error) {
            console.error("Failed to delete warehouse", error);
            alert("Failed to delete warehouse");
        }
    };

    const handleSelect = (warehouse: Warehouse) => {
        setSelectedWarehouse(warehouse);
        // Set cookie for server-side access (Dashboard)
        document.cookie = `warehouseId=${warehouse.id}; path=/; max-age=31536000`; // 1 year
        router.push("/dashboard");
    };

    // Helper to get my access info for a warehouse
    const getMyAccess = (warehouseId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return myRequests.find((r: any) => r.warehouseId === warehouseId) || null;
    };

    // Filter warehouses based on search
    const filteredWarehouses = warehouses.filter(wh =>
        wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wh.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (status === "loading") {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
    }

    if (status === "unauthenticated") {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-midnight py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center relative overflow-hidden">
            {/* Aurora Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-900/20 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-ruby-950/10 blur-[100px] rounded-full"></div>

            <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="absolute top-8 right-8 text-gray-500 hover:text-ruby-200 flex items-center gap-2 px-5 py-2.5 rounded-2xl glass-card border-white/5 hover:bg-ruby-950/20 transition-all text-xs font-black uppercase tracking-widest z-20"
            >
                <LogOut className="w-4 h-4" />
                Terminate Session
            </button>

            <div className="max-w-5xl w-full space-y-12 relative z-10">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-950 glow-emerald mb-8 hover:rotate-3 transition-transform cursor-pointer">
                        <Package className="w-10 h-10" />
                    </div>
                    <h2 className="text-5xl font-black text-white font-space-grotesk tracking-tighter">
                        {view === "CREATE" ? "Provision Warehouse" : "Select Terminal"}
                    </h2>
                    <p className="text-gray-400 font-medium tracking-tight max-w-md mx-auto">
                        Access authorized logistics nodes or initialize a new sector in the warehouse mesh.
                    </p>

                    {/* Premium Admin Tabs */}
                    {userRole === "ADMIN" && view !== "CREATE" && (
                        <div className="flex justify-center gap-2 mt-10 glass-card p-1.5 rounded-2xl w-fit mx-auto border-white/5">
                            <button
                                onClick={() => setView("SELECT")}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                                    view === "SELECT" ? "bg-emerald-100 text-emerald-950 glow-emerald" : "text-gray-500 hover:text-white"
                                )}
                            >
                                Terminals
                            </button>
                            <button
                                onClick={() => setView("REQUESTS")}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3",
                                    view === "REQUESTS" ? "bg-emerald-100 text-emerald-950 glow-emerald" : "text-gray-500 hover:text-white"
                                )}
                            >
                                Inflow Requests
                                {pendingRequests.length > 0 && (
                                    <span className={clsx("px-2 py-0.5 rounded-full font-black text-[9px]", view === "REQUESTS" ? "bg-emerald-950 text-emerald-100" : "bg-white/10 text-emerald-100")}>
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setView("STAFF")}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3",
                                    view === "STAFF" ? "bg-emerald-100 text-emerald-950 glow-emerald" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <Users className="w-3 h-3" />
                                Mesh Personnel
                            </button>
                        </div>
                    )}
                </div>

                {/* View Content */}
                {view === "CREATE" && (
                    <div className="glass-card p-12 rounded-[2.5rem] border-white/10 max-w-xl mx-auto shadow-2xl animate-in zoom-in-95 duration-300">
                        <form onSubmit={handleCreate} className="space-y-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-100 mb-3 uppercase tracking-widest italic opacity-50">Node Designation</label>
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="block w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-5 text-white font-bold focus:border-emerald-100/50 outline-none transition-all placeholder-gray-600"
                                        placeholder="e.g. Hyderabad Central Hub"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-100 mb-3 uppercase tracking-widest italic opacity-50">Geo-Location Sector</label>
                                    <input
                                        type="text"
                                        required
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                        className="block w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-5 text-white font-bold focus:border-emerald-100/50 outline-none transition-all placeholder-gray-600"
                                        placeholder="e.g. South Sector-A"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-6 px-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] text-emerald-950 bg-emerald-100 hover:bg-white glow-emerald disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    {isSubmitting ? "Initializing Matrix..." : "Confirm Initialization"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView("SELECT")}
                                    className="w-full text-center text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors py-2"
                                >
                                    Return to Selection
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {view === "SELECT" && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            {/* Search Bar */}
                            <div className="relative w-full md:w-[28rem] group">
                                <Search className="h-5 w-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-100 transition-colors" />
                                <input
                                    type="text"
                                    className="block w-full glass-card bg-midnight/30 pl-14 pr-6 py-4 border-transparent focus:border-emerald-100/20 rounded-2xl text-white font-bold placeholder-gray-600 outline-none transition-all"
                                    placeholder="Filter terminal nodes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {userRole === "ADMIN" && (
                                <button
                                    onClick={() => setView("CREATE")}
                                    className="flex items-center gap-3 bg-white/5 border border-white/5 text-emerald-100 px-6 py-4 rounded-2xl hover:bg-white/10 hover:border-emerald-100/20 transition-all shadow-xl font-black text-xs uppercase tracking-widest w-full md:w-auto justify-center"
                                >
                                    <Plus className="w-5 h-5" />
                                    Initialize New Sector
                                </button>
                            )}
                        </div>

                        {Array.isArray(filteredWarehouses) && filteredWarehouses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredWarehouses.map((wh) => {
                                    const access = getMyAccess(wh.id);
                                    const status = access?.status;
                                    const isExpired = access?.isExpired;

                                    return (
                                        <div 
                                            key={wh.id} 
                                            onClick={() => (userRole === "ADMIN" || (status === "APPROVED" && !isExpired)) && handleSelect(wh)}
                                            className={clsx(
                                                "glass-card p-10 rounded-[2.5rem] border-white/5 hover:border-emerald-100/20 transition-all group flex flex-col justify-between min-h-[220px]",
                                                (userRole === "ADMIN" || (status === "APPROVED" && !isExpired)) ? "cursor-pointer hover:bg-white/[0.03]" : "opacity-60 grayscale cursor-not-allowed"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 mb-6 group-hover:bg-emerald-100/10 group-hover:text-emerald-100 transition-all">
                                                        <Building2 className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-white group-hover:text-emerald-100 transition-colors font-space-grotesk tracking-tight uppercase">{wh.name}</h3>
                                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
                                                        <span className="w-1 h-1 bg-gray-700 rounded-full"></span> {wh.location} Sector
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                    {userRole === "ADMIN" ? (
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(wh.id, wh.name);
                                                                }}
                                                                className="w-11 h-11 flex items-center justify-center text-gray-600 hover:text-ruby-200 hover:bg-ruby-950/20 rounded-xl transition-all border border-transparent hover:border-ruby-500/20"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                            <div className="w-11 h-11 bg-emerald-100 text-emerald-950 rounded-xl flex items-center justify-center glow-emerald group-hover:scale-110 transition-all">
                                                                <ArrowRight className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {status === "APPROVED" && !isExpired && (
                                                                <div className="w-11 h-11 bg-emerald-100 text-emerald-950 rounded-xl flex items-center justify-center glow-emerald group-hover:scale-110 transition-all">
                                                                    <ArrowRight className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                            {status === "APPROVED" && isExpired && (
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <span className="bg-ruby-950/50 text-ruby-200 border border-ruby-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Auth Expired</span>
                                                                    <button
                                                                        onClick={() => handleRequest(wh.id)}
                                                                        className="text-emerald-100 text-[10px] font-black uppercase tracking-widest hover:underline"
                                                                    >
                                                                        Renew Access
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {status === "PENDING" && (
                                                                <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                                                                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">In Queue...</span>
                                                                </div>
                                                            )}
                                                            {status === "REJECTED" && (
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <span className="bg-ruby-950/50 text-ruby-200 border border-ruby-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Denied</span>
                                                                    <button
                                                                        onClick={() => handleRequest(wh.id)}
                                                                        className="text-emerald-100 text-[10px] font-black uppercase tracking-widest hover:underline"
                                                                    >
                                                                        Resubmit
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {!status && (
                                                                <button
                                                                    onClick={() => handleRequest(wh.id)}
                                                                    className="bg-emerald-100 text-emerald-950 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest glow-emerald hover:bg-white transition-all shadow-xl"
                                                                >
                                                                    Request Access
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-24 glass-card rounded-[3rem] border-white/5 border-dashed">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <Building2 className="w-10 h-10 text-gray-700" />
                                </div>
                                <h3 className="text-2xl font-black text-white font-space-grotesk uppercase tracking-tight">Mesh Grid Empty</h3>
                                <p className="text-gray-500 mt-2 font-medium">No terminal nodes active in current sector.</p>
                                {userRole === "ADMIN" && (
                                    <button
                                        onClick={() => setView("CREATE")}
                                        className="mt-10 inline-flex items-center gap-3 bg-emerald-100 text-emerald-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest glow-emerald hover:bg-white transition-all"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Provision Now
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {view === "REQUESTS" && (
                    <div className="glass-card rounded-[2.5rem] border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {Array.isArray(pendingRequests) && pendingRequests.length === 0 ? (
                            <div className="text-center py-32">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-emerald-100 opacity-20" />
                                </div>
                                <h3 className="text-xl font-bold text-white uppercase tracking-tight font-space-grotesk">Matrix Synchronized</h3>
                                <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-black text-[10px]">Zero pending auth requests.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/5">
                                {Array.isArray(pendingRequests) && pendingRequests.map((req) => (
                                    <li key={req.id} className="p-10 flex items-center justify-between group hover:bg-white/[0.01] transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-100 font-black text-xl group-hover:bg-emerald-100 group-hover:text-emerald-950 transition-all">
                                                {req.user?.name ? req.user.name.charAt(0) : "?"}
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-white font-space-grotesk tracking-tight uppercase">{req.user?.name || "Anonymous Entity"}</h4>
                                                <p className="text-gray-500 text-xs font-bold font-mono tracking-tighter lowercase">{req.user?.email}</p>
                                                <div className="flex items-center gap-3 mt-4">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100/50">Target:</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4 decoration-emerald-100/20">{req.warehouse.name}</span>
                                                    <span className="text-[9px] font-bold text-gray-700 ml-2">• Initialized {new Date(req.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleApprove(req.id, "APPROVED")}
                                                className="bg-emerald-100 text-emerald-950 hover:bg-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest glow-emerald active:scale-95 transition-all shadow-xl"
                                            >
                                                Authorize
                                            </button>
                                            <button
                                                onClick={() => handleApprove(req.id, "REJECTED")}
                                                className="bg-ruby-950/20 text-ruby-200 border border-ruby-500/20 hover:bg-ruby-950/40 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                            >
                                                Reject Entry
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {view === "STAFF" && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Premium Add Staff Card */}
                        <div className="glass-card p-10 rounded-[2.5rem] border-white/10 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/4 -translate-y-1/4">
                                <Users className="w-64 h-64 text-emerald-100" />
                            </div>
                            <h3 className="text-2xl font-black text-white font-space-grotesk tracking-tight uppercase mb-8 relative z-10">Provision Personnel</h3>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
                                    const warehouseId = (form.elements.namedItem("warehouseId") as HTMLSelectElement).value;

                                    if (!email || !warehouseId) return;
                                    setIsSubmitting(true);
                                    try {
                                        await axios.post("/api/warehouse-access/invite", { email, warehouseId });
                                        alert("Staff member synchronized.");
                                        form.reset();
                                        fetchStaff();
                                    } catch (err) {
                                        console.error(err);
                                        alert("Synchronization failed.");
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                className="flex flex-col lg:flex-row gap-4 relative z-10"
                            >
                                <div className="flex-1 group">
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="Identify by email (e.g. operator@emerald.logistics)"
                                        className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-emerald-100/50 outline-none transition-all placeholder-gray-600"
                                    />
                                </div>
                                <select
                                    name="warehouseId"
                                    required
                                    className="lg:w-64 glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-emerald-100/50 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Link to Terminal</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-emerald-100 text-emerald-950 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest glow-emerald hover:bg-white transition-all shadow-xl disabled:opacity-50"
                                >
                                    {isSubmitting ? "Deploying..." : "Assign Personnel"}
                                </button>
                            </form>
                        </div>

                        <div className="glass-card rounded-[2.5rem] border-white/10 overflow-hidden shadow-2xl">
                            {!Array.isArray(staffList) || staffList.length === 0 ? (
                                <div className="text-center py-32">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Users className="w-8 h-8 text-gray-700" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight font-space-grotesk">Zero Active Personnel</h3>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Initialize mesh access to list operators.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/5">
                                    {staffList.map((req: any) => (
                                        <li key={req.id} className="p-10 flex items-center justify-between group hover:bg-white/[0.01] transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 font-black text-xl group-hover:bg-emerald-100 group-hover:text-emerald-950 transition-all">
                                                    {req.user?.name ? req.user.name.charAt(0) : "?"}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-xl font-black text-white font-space-grotesk tracking-tight uppercase">{req.user?.name || "Inactive Asset"}</h4>
                                                        {req.isExpired && (
                                                            <span className="bg-ruby-950/50 text-ruby-200 border border-ruby-500/20 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">Expired</span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-500 text-xs font-mono font-bold lowercase tracking-tighter">{req.user?.email || "No Signal"}</p>
                                                    <div className="flex items-center gap-3 mt-4">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100/50">Stationed At:</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{req.warehouse?.name || "Deep Void"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {editingStaffId === req.user.id ? (
                                                    <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                                                        <input
                                                            className="glass-card bg-midnight/50 border-emerald-100/30 px-4 py-2 rounded-xl text-sm font-bold text-white outline-none w-64"
                                                            value={editStaffEmail}
                                                            onChange={(e) => setEditStaffEmail(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await axios.patch(`/api/users/${req.user.id}`, { email: editStaffEmail });
                                                                    setEditingStaffId(null);
                                                                    fetchStaff();
                                                                } catch (err) {
                                                                    alert("Sync failed.");
                                                                }
                                                            }}
                                                            className="bg-emerald-100 text-emerald-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                                                        >
                                                            Sync
                                                        </button>
                                                        <button onClick={() => setEditingStaffId(null)} className="text-gray-600 text-[10px] font-black uppercase hover:text-white transition-colors">Abndn</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => {
                                                                setEditingStaffId(req.user.id);
                                                                setEditStaffEmail(req.user.email);
                                                            }}
                                                            className="p-3 text-gray-500 hover:text-emerald-100 hover:bg-white/5 rounded-xl transition-all"
                                                        >
                                                            <Pencil className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveStaff(req.id)}
                                                            className="p-3 text-gray-500 hover:text-ruby-200 hover:bg-ruby-950/20 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
