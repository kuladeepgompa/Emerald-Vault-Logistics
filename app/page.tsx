import Link from "next/link";
import { Package, Truck, ArrowRight, Shield, Activity, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      {/* Aurora Background Effect */}
      <div className="absolute inset-0 -z-10 bg-midnight">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[50%] rounded-full bg-ruby-950/10 blur-[100px]"></div>
      </div>

      {/* Floating Glass Header */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl h-16 glass-card rounded-2xl px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center glow-emerald">
            <Package className="w-5 h-5 text-emerald-950" />
          </div>
          <span className="font-bold text-xl tracking-tight font-space-grotesk text-white">EMERALD VAULT</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-emerald-100 transition-colors">Features</a>
          <a href="#" className="hover:text-emerald-100 transition-colors">Logistics</a>
          <a href="#" className="hover:text-emerald-100 transition-colors">Security</a>
        </div>
        <Link 
          href="/api/auth/signin?callbackUrl=/select-org"
          className="bg-emerald-100 text-emerald-950 px-5 py-2 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all glow-emerald"
        >
          Sign In
        </Link>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-48 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Hero Content */}
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-700/30 text-emerald-100 text-xs font-bold tracking-widest uppercase">
              <Activity className="w-3 h-3" /> Real-time Logistics
            </div>
            <h1 className="text-6xl md:text-8xl font-bold font-space-grotesk leading-[0.9] text-white">
              The Future of <br />
              <span className="text-emerald-100 text-shadow-glow">Warehouse</span> <br />
              Management.
            </h1>
            <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
              Precision-engineered logistics for the modern enterprise. Track stock, manage fleets, and optimize operations with an industrial-grade interface.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/api/auth/signin?callbackUrl=/select-org"
                className="group flex items-center gap-2 bg-emerald-100 text-emerald-950 px-8 py-4 rounded-2xl font-bold hover:bg-white transition-all shadow-xl shadow-emerald-950/20"
              >
                Launch Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-4 rounded-2xl font-bold text-white border border-white/10 hover:bg-white/5 transition-all">
                View Documentation
              </button>
            </div>
          </div>

          {/* Social Proof / Stats Grid */}
          <div className="grid grid-cols-2 gap-6 relative">
            <div className="absolute -inset-4 bg-emerald-100/5 blur-3xl -z-10 rounded-full"></div>
            <FeatureCard 
              icon={Shield} 
              title="Military Grade" 
              desc="SEC-standard data encryption for global assets."
              color="emerald"
            />
            <FeatureCard 
              icon={Globe} 
              title="Global Reach" 
              desc="Multi-warehouse syncing across 6 continents."
              color="ruby"
              className="mt-8"
            />
            <FeatureCard 
              icon={Truck} 
              title="Live Fleet" 
              desc="Real-time vehicle telemetry and driver analytics."
              color="ruby"
            />
            <FeatureCard 
              icon={Package} 
              title="Inventory AI" 
              desc="Predictive stock alerts and automated reordering."
              color="emerald"
              className="mt-8"
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 pt-12 pb-24 text-center">
        <p className="text-gray-600 text-sm">
          &copy; 2026 Emerald Vault Logistics. All systems operational.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, className = "" }: any) {
  return (
    <div className={`glass-card p-8 rounded-3xl flex flex-col gap-4 group hover:bg-white/[0.03] transition-all ${className}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
        color === 'emerald' ? 'bg-emerald-900/30 text-emerald-100 group-hover:glow-emerald' : 'bg-ruby-950/30 text-ruby-200 group-hover:glow-ruby'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-white font-space-grotesk">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
