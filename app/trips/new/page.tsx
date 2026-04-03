"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Trash2,
  Plus,
  ArrowLeft,
  Truck,
  PackagePlus,
  Check,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import axios from "axios";
import { useGodown } from "@/components/GodownProvider";

export default function NewTripPage() {
  const router = useRouter();
  const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();

  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vehicles, setVehicles] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);

  const [selectedVehicle, setSelectedVehicle] = useState("");

  // Manifest State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [manifest, setManifest] = useState<any[]>([]);

  // Guided Selection State
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedPack, setSelectedPack] = useState("");
  const [addQuantity, setAddQuantity] = useState(1);

  // Derived Data
  const [availableFlavours, setAvailableFlavours] = useState<string[]>([]);
  const [availablePacks, setAvailablePacks] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [targetProduct, setTargetProduct] = useState<any>(null);

  useEffect(() => {
    if (selectedWarehouse && !isWarehouseLoading) {
      fetchData();
    }
  }, [selectedWarehouse, isWarehouseLoading]);

  const fetchData = async () => {
    if (!selectedWarehouse) return;
    try {
      const [vRes, pRes] = await Promise.all([
        axios.get(`/api/vehicles?warehouseId=${selectedWarehouse.id}`),
        axios.get(`/api/products?warehouseId=${selectedWarehouse.id}`),
      ]);
      setVehicles(Array.isArray(vRes.data) ? vRes.data : []);

      const prodData = Array.isArray(pRes.data) ? pRes.data : [];
      setProducts(prodData);

      // Extract unique flavours
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flavs = Array.from(
        new Set(prodData.map((p: any) => p.flavour).filter(Boolean)),
      ) as string[];
      setAvailableFlavours(flavs.sort());
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  // Update Available Packs when Flavour Changes
  useEffect(() => {
    if (selectedFlavour) {
      const packs = products
        .filter((p) => p.flavour === selectedFlavour)
        .map((p) => p.pack)
        .filter(Boolean);

      const uniquePacks = Array.from(new Set(packs)) as string[];

      // Sort logic: ml first, then Ltr
      uniquePacks.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();

        const isAMl = aLower.includes("ml");
        const isBMl = bLower.includes("ml");
        const isALtr = aLower.includes("ltr") || aLower.includes("liter");
        const isBLtr = bLower.includes("ltr") || bLower.includes("liter");

        if (isAMl && !isBMl) return -1;
        if (!isAMl && isBMl) return 1;
        if ((isAMl && isBMl) || (isALtr && isBLtr)) {
          const numA = parseFloat(a.replace(/[^0-9.]/g, ""));
          const numB = parseFloat(b.replace(/[^0-9.]/g, ""));
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        }
        return a.localeCompare(b);
      });

      setAvailablePacks(uniquePacks);
    } else {
      setAvailablePacks([]);
    }
  }, [selectedFlavour, products]);

  // Determine Target Product when Flavour & Pack are selected
  useEffect(() => {
    if (selectedFlavour && selectedPack) {
      const prod = products.find(
        (p) => p.flavour === selectedFlavour && p.pack === selectedPack,
      );
      setTargetProduct(prod || null);
      if (prod) setAddQuantity(1);
    } else {
      setTargetProduct(null);
    }
  }, [selectedFlavour, selectedPack, products]);

  const addToManifest = () => {
    if (!targetProduct || addQuantity <= 0) return;

    // Check stock locally
    if (addQuantity > targetProduct.quantity) {
      alert(`Insufficient stock! Available: ${targetProduct.quantity}`);
      return;
    }

    // Check if already in manifest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingIndex = manifest.findIndex(
      (item: any) => item.productId === targetProduct.id,
    );

    if (existingIndex >= 0) {
      // Update quantity
      const newManifest = [...manifest];
      const newQty = newManifest[existingIndex].qtyLoaded + addQuantity;
      if (newQty > targetProduct.quantity) {
        alert(`Cannot add more. Total would exceed stock.`);
        return;
      }
      newManifest[existingIndex].qtyLoaded = newQty;
      setManifest(newManifest);
    } else {
      setManifest([
        ...manifest,
        {
          productId: targetProduct.id,
          name: targetProduct.name,
          flavour: targetProduct.flavour,
          pack: targetProduct.pack,
          qtyLoaded: addQuantity,
          currentStock: targetProduct.quantity,
          invoiceCost: targetProduct.invoiceCost || 0,
          dailyPrice: targetProduct.dailyPrice || targetProduct.price || 0,
        },
      ]);
    }

    setAddQuantity(1);
    setSelectedPack("");
  };

  const removeFromManifest = (index: number) => {
    setManifest(manifest.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedVehicle) return alert("Select a vehicle");
    if (manifest.length === 0) return alert("Add items to load");
    if (!selectedWarehouse) return;

    setLoading(true);
    try {
      await axios.post("/api/trips", {
        vehicleId: selectedVehicle,
        warehouseId: selectedWarehouse.id,
        items: manifest.map((m) => ({
          productId: m.productId,
          qtyLoaded: m.qtyLoaded,
        })),
      });

      router.push("/trips");
      router.refresh(); // Refresh (though Next.js refresh sometimes tricky with client route)
    } catch (err: any) {
      alert(
        err.response?.data?.error || err.message || "Failed to create trip",
      );
    } finally {
      setLoading(false);
    }
  };

  const totalCost = manifest.reduce(
    (sum, item) => sum + (item.invoiceCost || 0) * item.qtyLoaded,
    0,
  );
  const totalRevenue = manifest.reduce(
    (sum, item) => sum + (item.dailyPrice || 0) * item.qtyLoaded,
    0,
  );
  const totalProfit = totalRevenue - totalCost;

  if (isWarehouseLoading)
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!selectedWarehouse)
    return <div className="p-12 text-center">Select a warehouse first.</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex items-center gap-6">
        <Link
          href="/trips"
          className="w-12 h-12 glass-card flex items-center justify-center rounded-2xl text-gray-500 hover:text-emerald-100 hover:border-emerald-100/20 transition-all group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-4xl font-black text-white font-space-grotesk tracking-tighter uppercase grayscale hover:grayscale-0 transition-all cursor-default">
            Manifest <span className="text-emerald-500 opacity-50">/</span> Initialization
          </h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Sector: {selectedWarehouse.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Selection Matrix */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. Vehicle Selection */}
          <div className="glass-card p-10 rounded-[2.5rem] border-white/5 bg-white/[0.01]">
            <h2 className="text-lg font-black text-white font-space-grotesk tracking-tight uppercase mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-950/30 text-emerald-500 flex items-center justify-center text-xs">01</span>
              Vehicle Designation
            </h2>

            {vehicles.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-gray-600 text-xs font-black uppercase tracking-widest">No active transport assets detected</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {vehicles.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    disabled={v.status !== "AVAILABLE"}
                    className={clsx(
                      "p-6 rounded-[2rem] border transition-all text-left group relative overflow-hidden",
                      {
                        "bg-emerald-100 text-emerald-950 border-emerald-100 glow-emerald":
                          selectedVehicle === v.id,
                        "bg-white/[0.02] border-white/5 hover:border-emerald-100/20":
                          selectedVehicle !== v.id && v.status === "AVAILABLE",
                        "opacity-30 cursor-not-allowed bg-transparent border-white/5 grayscale":
                          v.status !== "AVAILABLE",
                      },
                    )}
                  >
                    <div className="relative z-10">
                      <div className={clsx("text-xl font-black font-space-grotesk tracking-tight uppercase", {
                        "text-emerald-950": selectedVehicle === v.id,
                        "text-white": selectedVehicle !== v.id
                      })}>
                        {v.number}
                      </div>
                      <div className={clsx("text-[10px] font-black uppercase tracking-widest mt-1", {
                        "text-emerald-950/60": selectedVehicle === v.id,
                        "text-gray-500": selectedVehicle !== v.id
                      })}>
                        {v.driverName}
                      </div>
                    </div>
                    {v.status !== "AVAILABLE" && (
                      <div className="absolute top-4 right-6 text-[8px] font-black uppercase tracking-widest text-ruby-500 bg-ruby-950/20 px-2 py-0.5 rounded-lg border border-ruby-500/20">
                        Occupied
                      </div>
                    )}
                    <Truck className={clsx("absolute -bottom-4 -right-4 w-20 h-20 opacity-5 transition-transform group-hover:scale-110", {
                      "text-emerald-900": selectedVehicle === v.id,
                      "text-white": selectedVehicle !== v.id
                    })} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Inventory Mesh */}
          <div className="glass-card p-10 rounded-[2.5rem] border-white/5 bg-white/[0.01]">
            <h2 className="text-lg font-black text-white font-space-grotesk tracking-tight uppercase mb-10 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-950/30 text-emerald-500 flex items-center justify-center text-xs">02</span>
              Payload Selection
            </h2>

            {products.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-gray-600 text-xs font-black uppercase tracking-widest">Inventory grid empty</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Flavour Matrix */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">
                    Product Flavour
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableFlavours.map((flav) => (
                      <button
                        key={flav}
                        onClick={() => {
                          setSelectedFlavour(flav);
                          setSelectedPack("");
                        }}
                        className={clsx(
                          "p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all text-center",
                          {
                            "bg-emerald-100 text-emerald-950 border-emerald-100":
                              selectedFlavour === flav,
                            "bg-white/[0.02] border-white/5 text-gray-500 hover:border-emerald-100/20 hover:text-white":
                              selectedFlavour !== flav,
                          },
                        )}
                      >
                        {flav}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pack Configuration */}
                {selectedFlavour && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">
                      Packet Specification
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {availablePacks.map((pack) => (
                        <button
                          key={pack}
                          onClick={() => setSelectedPack(pack)}
                          className={clsx(
                            "px-6 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                            {
                              "bg-emerald-950/40 text-emerald-100 border-emerald-500/30":
                                selectedPack === pack,
                              "bg-white/[0.02] border-white/5 text-gray-500 hover:border-emerald-100/20 hover:text-white":
                                selectedPack !== pack,
                            },
                          )}
                        >
                          {pack}
                          {selectedPack === pack && (
                            <Check className="w-3 h-3 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Integration Stage */}
                {targetProduct && (
                  <div className="glass-card bg-emerald-950/10 border-emerald-500/10 p-8 rounded-[2rem] animate-in zoom-in-95 duration-500 flex flex-col md:flex-row items-center gap-8 border">
                    <div className="flex-1 text-center md:text-left">
                      <div className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest italic mb-1">Target Identified</div>
                      <div className="text-2xl font-black text-white font-space-grotesk tracking-tight uppercase">
                        {targetProduct.name}
                      </div>
                      <div className="text-[10px] font-black text-emerald-100/40 uppercase tracking-[0.2em] mt-1">
                        In Sector: {targetProduct.quantity} Units
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 text-center">Load Units</label>
                        <input
                          type="number"
                          min="1"
                          value={addQuantity || ""}
                          onChange={(e) =>
                            setAddQuantity(Number(e.target.value))
                          }
                          className="w-full bg-midnight/50 border-white/5 rounded-2xl px-4 py-4 text-center font-black text-xl text-white focus:border-emerald-500/30 outline-none transition-all"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={addToManifest}
                        disabled={addQuantity <= 0}
                        className="bg-emerald-100 text-emerald-950 h-16 w-16 md:w-auto md:px-10 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest glow-emerald hover:bg-white active:scale-95 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline">Integrate</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Manifest Intelligence */}
        <div className="lg:col-span-4 sticky top-8">
          <div className="glass-card rounded-[2.5rem] border-white/10 shadow-2xl bg-white/[0.02] flex flex-col h-[calc(100vh-140px)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
            
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white font-space-grotesk tracking-tight uppercase">Manifest</h2>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">Current Load Status</p>
              </div>
              <div className="bg-emerald-950/40 text-emerald-100 border border-emerald-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {manifest.length} Nodes
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {manifest.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <PackagePlus className="w-16 h-16 text-emerald-100 mb-6" />
                  <p className="text-xs font-black uppercase tracking-widest max-w-[140px]">Awaiting payload integration</p>
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                manifest.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="glass-card p-5 rounded-2xl border-white/5 bg-white/[0.01] flex items-center gap-4 group hover:border-emerald-500/20 transition-all animate-in slide-in-from-right-4 duration-300"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                        {item.name}
                      </div>
                      <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">
                        {item.flavour} <span className="opacity-30 mx-1">•</span> {item.pack}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-100 font-space-grotesk">
                        {item.qtyLoaded}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromManifest(idx)}
                      className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-ruby-500 hover:bg-ruby-950/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {manifest.length > 0 && (
              <div className="p-8 border-t border-white/5 bg-white/[0.02] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Valuation</span>
                  <span className="text-sm font-black text-white font-mono">₹{totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Projected Alpha</span>
                  <span
                    className={clsx(
                      "text-sm font-black font-mono",
                      totalProfit > 0
                        ? "text-emerald-500"
                        : totalProfit < 0
                          ? "text-ruby-500"
                          : "text-white",
                    )}
                  >
                    {totalProfit > 0 ? "+" : ""}₹{totalProfit.toFixed(2)}
                  </span>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={manifest.length === 0 || !selectedVehicle || loading}
                    className="w-full bg-emerald-100 text-emerald-950 py-5 rounded-2xl font-black text-xs uppercase tracking-widest glow-emerald hover:bg-white active:scale-95 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-950" />
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <Save className="w-4 h-4" />
                        Finalize Deployment
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
