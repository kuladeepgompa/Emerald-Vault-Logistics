"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Save,
  Loader2,
  Search,
} from "lucide-react";
import { useGodown } from "@/components/GodownProvider";
import clsx from "clsx";

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number; // MRP
  dailyPrice: number; // Effective today's price
  isDailyPriceOverridden: boolean;
  location?: string;
  invoiceCost?: number;
  salePrice?: number;
  pack?: string;
  flavour?: string;
}

export function StockTable({ isAdmin }: { isAdmin: boolean }) {
  const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Daily Pricing State
  const [updatingPricingId, setUpdatingPricingId] = useState<string | null>(
    null,
  );

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  // Add State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedPack, setSelectedPack] = useState("");
  const [addQuantity, setAddQuantity] = useState("");

  const flavours = Array.from(
    new Set(products.map((p) => p.flavour).filter(Boolean)),
  );
  const packs = Array.from(
    new Set(products.map((p) => p.pack).filter(Boolean)),
  );

  const [newProduct, setNewProduct] = useState({
    name: "",
    quantity: "",
    price: "",
    invoiceCost: "",
    salePrice: "",
    location: "",
    pack: "",
    flavour: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedWarehouse && !isWarehouseLoading) {
      fetchProducts();
    }
  }, [selectedWarehouse, isWarehouseLoading]);

  const fetchProducts = async () => {
    if (!selectedWarehouse) return;
    setIsLoading(true);
    try {
      const res = await axios.get(
        `/api/products?warehouseId=${selectedWarehouse.id}`,
      );
      const data = Array.isArray(res.data) ? res.data : [];
      // Preserve API order (Main Warehouse Order)
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDailyPriceChange = async (productId: string, price: string) => {
    if (!selectedWarehouse) return;
    setUpdatingPricingId(productId);
    try {
      await axios.post("/api/daily-pricing", {
        productId,
        warehouseId: selectedWarehouse.id,
        price: price ? Number(price) : null,
        date: new Date().toISOString(),
      });
      fetchProducts();
    } catch (error) {
      alert("Failed to update daily price");
    } finally {
      setUpdatingPricingId(null);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    const { ...form } = product;
    setEditForm(form);
  };

  const handleSave = async (id: string) => {
    try {
      await axios.patch(`/api/products/${id}`, editForm);
      setEditingId(null);
      fetchProducts(); // Refresh to be safe
    } catch (error) {
      alert("Failed to update product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await axios.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (error) {
      alert("Failed to delete product");
    }
  };

  const handleAddExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlavour || !selectedPack || !addQuantity) return;
    setIsSubmitting(true);
    try {
      const product = products.find(
        (p) => p.flavour === selectedFlavour && p.pack === selectedPack,
      );
      if (!product) {
        alert("Product not found with this combination.");
        return;
      }

      const newQty = (product.quantity || 0) + Number(addQuantity);
      await axios.patch(`/api/products/${product.id}`, { quantity: newQty });

      setIsAddModalOpen(false);
      setSelectedFlavour("");
      setSelectedPack("");
      setAddQuantity("");
      fetchProducts();
    } catch (error) {
      alert("Failed to add stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    setIsSubmitting(true);
    try {
      await axios.post("/api/products", {
        ...newProduct,
        warehouseId: selectedWarehouse.id,
      });
      setIsAddModalOpen(false);
      setNewProduct({
        name: "",
        quantity: "",
        price: "",
        invoiceCost: "",
        salePrice: "",
        location: "",
        pack: "",
        flavour: "",
      });
      fetchProducts();
    } catch (error) {
      alert("Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name && String(p.name).toLowerCase().includes(term)) ||
      (p.sku && String(p.sku).toLowerCase().includes(term)) ||
      (p.pack && String(p.pack).toLowerCase().includes(term)) ||
      (p.flavour && String(p.flavour).toLowerCase().includes(term))
    );
  });

  if (isWarehouseLoading) return <div>Loading...</div>;
  if (!selectedWarehouse) return <div>Please select a warehouse first.</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center mb-10 flex-wrap gap-6 glass-card p-8 rounded-3xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-1.5 h-5 bg-emerald-100 rounded-full glow-emerald"></div>
             <h1 className="text-3xl font-bold font-space-grotesk text-white tracking-tight">Stock Repository</h1>
          </div>
          <p className="text-sm text-gray-400 font-medium tracking-tight">Central nervous system for inventory logistics</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-100 transition-colors" />
            <input
              type="text"
              placeholder="Query SKU or Product..."
              className="pl-12 pr-6 py-3.5 glass-card bg-midnight/30 border-transparent focus:border-emerald-100/30 rounded-2xl outline-none w-full sm:w-80 text-sm font-bold text-white placeholder-gray-600 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-100 hover:bg-white text-emerald-950 px-6 py-3.5 rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-xs glow-emerald hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-950/20"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Provision Stock
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border-transparent">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/5 uppercase tracking-[0.2em] text-[10px] font-black text-gray-500">
                <th className="px-8 py-6">Asset Specification</th>
                <th className="px-6 py-6">Unit Cost</th>
                <th className="px-6 py-6">Base MRP</th>
                <th className="px-6 py-6 border-x border-white/5">Terminal Quote (Fixed/Daily)</th>
                <th className="px-6 py-6 text-center">Flux</th>
                <th className="px-6 py-6">Retail Cap</th>
                <th className="px-8 py-6 text-right">Inventory Count</th>
                <th className="px-8 py-6 text-right">Cmd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-100 opacity-20" />
                        <span className="text-gray-500 font-bold tracking-widest uppercase text-xs">Accessing Data Grid...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center">
                            <Search className="w-8 h-8 text-gray-700" />
                        </div>
                        <p className="text-gray-500 font-bold leading-relaxed">
                          {products.length > 0 && searchTerm
                            ? `Zero matches for "${searchTerm}" in current sector.`
                            : `Repository empty for ${selectedWarehouse.name}.`}
                        </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const profit =
                    product.dailyPrice -
                    (product.invoiceCost || product.dailyPrice);

                  return (
                    <tr
                      key={product.id}
                      className="group hover:bg-white/[0.02] transition-all"
                    >
                      {editingId === product.id ? (
                        <>
                          <td className="px-8 py-6">
                            <input
                              className="glass-card bg-midnight/50 border-emerald-100/20 rounded-xl px-3 py-2 w-full text-white font-bold outline-none"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                            />
                          </td>
                          <td className="px-6 py-6">
                            <input
                              type="number"
                              className="glass-card bg-midnight/50 border-emerald-100/20 rounded-xl px-3 py-2 w-24 text-emerald-100 font-mono outline-none"
                              value={editForm.invoiceCost}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  invoiceCost: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="px-6 py-6">
                            <input
                              type="number"
                              className="glass-card bg-midnight/50 border-emerald-100/20 rounded-xl px-3 py-2 w-24 text-white font-mono outline-none"
                              value={editForm.price}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  price: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="px-6 py-6 border-x border-white/5">
                            <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest italic">
                              Lock values in View Mode
                            </span>
                          </td>
                          <td className="px-6 py-6 text-center">-</td>
                          <td className="px-6 py-6">
                            <input
                              type="number"
                              className="glass-card bg-midnight/50 border-emerald-100/20 rounded-xl px-3 py-2 w-24 text-white font-mono outline-none"
                              value={editForm.salePrice}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  salePrice: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="px-8 py-6 text-right">
                            <input
                              type="number"
                              className="glass-card bg-midnight/50 border-emerald-100/20 rounded-xl px-3 py-2 w-24 text-right text-emerald-100 font-black outline-none"
                              value={editForm.quantity}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  quantity: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="px-8 py-6 text-right flex justify-end gap-3 translate-y-3">
                            <button
                              onClick={() => handleSave(product.id)}
                              className="w-10 h-10 bg-emerald-100 text-emerald-950 rounded-xl flex items-center justify-center glow-emerald hover:scale-110 transition-all"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="w-10 h-10 bg-white/5 text-gray-400 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-white tracking-tight group-hover:text-emerald-100 transition-colors uppercase text-sm">{product.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 bg-white/5 px-2 py-0.5 rounded-md">{product.pack}</span>
                                    <span className="text-[10px] font-bold text-gray-500 italic">{product.flavour}</span>
                                </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-gray-400 font-mono">
                            ₹{product.invoiceCost || "-"}
                          </td>
                          <td className="px-6 py-6 text-white font-bold font-mono">
                            ₹{product.price || "-"}
                          </td>
                          <td className="px-6 py-6 border-x border-white/5">
                            {isAdmin ? (
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  placeholder={(
                                    product.salePrice || product.price
                                  ).toString()}
                                  className={clsx(
                                    "glass-card bg-midnight/50 px-4 py-2.5 w-28 text-sm font-black tracking-tighter outline-none transition-all rounded-xl",
                                    product.isDailyPriceOverridden
                                      ? "border-ruby-200/30 text-ruby-200 shadow-[0_0_15px_-2px_rgba(255,178,190,0.1)]"
                                      : "border-white/5 text-gray-400 focus:border-emerald-100/30 ring-0",
                                  )}
                                  defaultValue={
                                    product.isDailyPriceOverridden
                                      ? product.dailyPrice
                                      : ""
                                  }
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    if (
                                      val !== product.dailyPrice.toString() ||
                                      (val === "" &&
                                        product.isDailyPriceOverridden)
                                    ) {
                                      handleDailyPriceChange(product.id, val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                />
                                {updatingPricingId === product.id && (
                                  <Loader2 className="w-4 h-4 animate-spin text-emerald-100" />
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span
                                  className={clsx(
                                    "font-black text-lg tracking-tighter",
                                    product.isDailyPriceOverridden
                                      ? "text-ruby-200"
                                      : "text-white",
                                  )}
                                >
                                  ₹{product.dailyPrice}
                                </span>
                                {!product.isDailyPriceOverridden && (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Standard MRP Quote</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span
                              className={clsx(
                                "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                profit > 0
                                  ? "bg-emerald-900/20 text-emerald-100 border-emerald-500/20"
                                  : profit < 0
                                    ? "bg-ruby-950/20 text-ruby-200 border-ruby-500/20"
                                    : "bg-white/5 text-gray-500 border-white/5",
                              )}
                            >
                              {profit > 0 ? "Gain +" : profit < 0 ? "Loss " : "Par "}
                              {Math.abs(profit).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-gray-500 italic text-xs font-medium">
                            ₹{product.salePrice || "-"}
                          </td>
                          <td className="px-8 py-6 text-right font-medium">
                            <div className="flex items-center justify-end gap-3">
                              <input
                                type="number"
                                className={clsx(
                                  "glass-card bg-midnight/50 px-4 py-2.5 w-24 text-right font-black text-base outline-none transition-all rounded-xl",
                                  product.quantity < 10
                                    ? "border-ruby-500/30 text-ruby-200 glow-ruby"
                                    : product.quantity < 50
                                      ? "border-amber-500/30 text-amber-500 shadow-[0_0_15px_-2px_rgba(255,193,7,0.1)]"
                                      : "border-emerald-500/30 text-emerald-100",
                                )}
                                defaultValue={product.quantity}
                                onBlur={async (e) => {
                                  const newVal = Number(e.target.value);
                                  if (newVal !== product.quantity) {
                                    try {
                                      await axios.patch(
                                        `/api/products/${product.id}`,
                                        { quantity: newVal },
                                      );
                                      fetchProducts();
                                    } catch (err) {
                                      alert("Quantity synchronization failed.");
                                      e.target.value =
                                        product.quantity.toString();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={() => handleEditClick(product)}
                                  className="p-2.5 text-gray-500 hover:text-emerald-100 hover:bg-white/5 rounded-xl transition-all"
                                >
                                  <Pencil className="w-4.5 h-4.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDelete(product.id)}
                                    className="p-2.5 text-gray-500 hover:text-ruby-200 hover:bg-ruby-950/20 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redesigned Premium Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-midnight/80 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="glass-card bg-midnight/80 border-white/10 rounded-[3rem] w-full max-w-5xl overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] flex flex-col md:flex-row min-h-[600px] relative">
            <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-8 right-8 p-3 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all z-10"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Panel Left: Existing Flow */}
            <div
              className={clsx(
                "flex-1 p-12 transition-all flex flex-col relative overflow-hidden",
                addMode === "EXISTING"
                  ? "bg-white/5 shadow-[inset_-20px_0_50px_-20px_rgba(0,0,0,0.5)]"
                  : "opacity-30 grayscale blur-[2px] pointer-events-none",
              )}
            >
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ruby-950/20 border border-ruby-500/20 text-ruby-200 text-[10px] font-black uppercase tracking-widest mb-4">
                    Flow A / Recursive Update
                </div>
                <h2 className="text-4xl font-black text-white font-space-grotesk tracking-tighter">Sync Existing</h2>
                <p className="text-gray-400 mt-2 font-medium">Increment stock volume for registered assets.</p>
              </div>

              <form onSubmit={handleAddExisting} className="space-y-8 flex-1 flex flex-col">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="relative group">
                        <label className="block text-[10px] font-black text-ruby-200 mb-3 uppercase tracking-widest">Select Terminal Asset</label>
                        <select
                          required
                          className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-5 text-white font-bold focus:border-ruby-200/50 transition-all outline-none appearance-none cursor-pointer group-hover:bg-midnight/70"
                          value={selectedFlavour}
                          onChange={(e) => setSelectedFlavour(e.target.value)}
                        >
                          <option value="">Query Flavour...</option>
                          {flavours.map((f) => (
                            <option key={f as string} value={f as string}>{f as string}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative group">
                        <label className="block text-[10px] font-black text-ruby-200 mb-3 uppercase tracking-widest">Select Tier Pack</label>
                        <select
                          required
                          className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-5 text-white font-bold focus:border-ruby-200/50 transition-all outline-none appearance-none cursor-pointer group-hover:bg-midnight/70"
                          value={selectedPack}
                          onChange={(e) => setSelectedPack(e.target.value)}
                        >
                          <option value="">Query Pack...</option>
                          {packs.map((p) => (
                            <option key={p as string} value={p as string}>{p as string}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-ruby-200 mb-3 uppercase tracking-widest">Inflow Quantity</label>
                      <input
                        required
                        type="number"
                        placeholder="0000"
                        className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-6 text-white font-space-grotesk text-5xl font-black focus:border-ruby-200/50 transition-all outline-none placeholder-white/5"
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(e.target.value)}
                      />
                    </div>
                </div>
                <div className="mt-auto pt-8">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-ruby-200 text-ruby-950 font-black py-6 rounded-[2rem] hover:bg-white glow-ruby active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
                  >
                    {isSubmitting ? "Syncing Array..." : "Confirm Deployment"}
                  </button>
                  <button type="button" onClick={() => setAddMode("NEW")} className="w-full text-center mt-6 text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">
                    Switch to Flow B / New Entry
                  </button>
                </div>
              </form>
            </div>

            {/* Panel Right: New Flow */}
            <div
              className={clsx(
                "flex-[1.2] p-12 transition-all flex flex-col relative",
                addMode === "NEW"
                  ? "bg-white/[0.02]"
                  : "opacity-30 grayscale blur-[2px] pointer-events-none",
              )}
            >
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/20 border border-emerald-500/20 text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-4">
                    Flow B / Cold Start Registration
                </div>
                <h2 className="text-4xl font-black text-white font-space-grotesk tracking-tighter">Provision New</h2>
                <p className="text-gray-400 mt-2 font-medium">Integrate a new asset into the global mesh.</p>
              </div>

              <form onSubmit={handleAdd} className="space-y-6 flex-1 flex flex-col">
                <div className="space-y-4">
                    <div className="relative">
                        <label className="block text-[10px] font-black text-emerald-100 mb-2 uppercase tracking-widest italic opacity-50">Identity Specification</label>
                        <input
                          required
                          placeholder="Asset Identifier (e.g. Sprite Extreme 2.25L)"
                          className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-5 text-white font-bold focus:border-emerald-100/50 outline-none transition-all"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                          <input
                            required
                            placeholder="Variant/Flavour"
                            className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-100/50"
                            value={newProduct.flavour}
                            onChange={(e) => setNewProduct({ ...newProduct, flavour: e.target.value })}
                          />
                          <input
                            required
                            type="number"
                            placeholder="Initial Count"
                            className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-emerald-100 font-bold outline-none focus:border-emerald-100/50 font-mono"
                            value={newProduct.quantity}
                            onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                          />
                          <input
                            required
                            type="number"
                            placeholder="Invoice Cost ₹"
                            className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-gray-400 font-bold outline-none focus:border-emerald-100/50 font-mono"
                            value={newProduct.invoiceCost}
                            onChange={(e) => setNewProduct({ ...newProduct, invoiceCost: e.target.value })}
                          />
                      </div>
                      <div className="space-y-4">
                          <input
                            required
                            placeholder="Volume Size"
                            className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-100/50"
                            value={newProduct.pack}
                            onChange={(e) => setNewProduct({ ...newProduct, pack: e.target.value })}
                          />
                          <input
                            required
                            type="number"
                            placeholder="Base MRP ₹"
                            className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-100/50 font-mono"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                          />
                          <input
                            type="number"
                            placeholder="Sale Target ₹"
                            className="w-full glass-card bg-midnight/50 border-white/5 rounded-2xl px-6 py-4 text-emerald-100 font-bold outline-none focus:border-emerald-100/50 font-mono"
                            value={newProduct.salePrice}
                            onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                          />
                      </div>
                    </div>
                </div>
                <div className="mt-auto pt-8">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-100 text-emerald-950 font-black py-6 rounded-[2rem] hover:bg-white glow-emerald active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
                  >
                    {isSubmitting ? "Integrating Core..." : "Register Asset"}
                  </button>
                  <button type="button" onClick={() => setAddMode("EXISTING")} className="w-full text-center mt-6 text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">
                    Return to Flow A / Sync
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
