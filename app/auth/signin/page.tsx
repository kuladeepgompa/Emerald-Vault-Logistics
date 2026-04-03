"use client";

import { signIn } from "next-auth/react";
import { ShieldCheck, Package, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    return (
        <div className="min-h-screen bg- midnight flex items-center justify-center p-6 relative overflow-hidden transition-all duration-1000">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ruby-500/5 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-lg relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Branding Logic */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-emerald-500 rounded-3xl mx-auto mb-6 flex items-center justify-center glow-emerald shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer">
                        <Package className="w-10 h-10 text-emerald-950" />
                    </div>
                    <h1 className="text-5xl font-black text-foreground font-space-grotesk tracking-tighter uppercase mb-2">
                        Emerald <span className="text-emerald-500">Vault</span>
                    </h1>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] italic">
                        Terminal Authorization Required
                    </p>
                </div>

                {/* Glassmorphic Portal Card */}
                <div className="glass-card p-12 rounded-[3.5rem] border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent pointer-events-none"></div>
                    
                    <div className="relative z-10 text-center">
                        <div className="mb-10 text-left space-y-4">
                            <h2 className="text-2xl font-black text-foreground font-space-grotesk uppercase tracking-tight">
                                Access Protocol
                            </h2>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                                Please authorize your credentials via the primary logistics node to access the terminal matrix.
                            </p>
                        </div>

                        <button
                            onClick={() => signIn("google", { callbackUrl })}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] glow-emerald shadow-xl group/btn"
                        >
                            Authorize via Google Node
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        <div className="mt-12 flex items-center justify-center gap-4 opacity-30 grayscale group-hover:grayscale-0 transition-all duration-700">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-foreground">Secure Node</span>
                            </div>
                            <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-foreground">V 4.0.2</span>
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="mt-12 text-center">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">
                        Logistics Intelligence Unit <span className="mx-2 opacity-20">//</span> Sector 7G
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg- midnight flex items-center justify-center text-emerald-500 font-black animate-pulse uppercase tracking-widest">Initializing Terminal...</div>}>
            <SignInContent />
        </Suspense>
    );
}
