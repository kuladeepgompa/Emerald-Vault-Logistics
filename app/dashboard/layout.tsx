import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import WarehouseGuard from "@/components/WarehouseGuard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <WarehouseGuard>
            <div className="min-h-screen bg-midnight flex">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 transition-all">
                    <MobileHeader />
                    <main className="flex-1 p-4 md:p-10">
                        <div className="max-w-[1600px] mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </WarehouseGuard>
    );
}