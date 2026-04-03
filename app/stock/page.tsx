import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StockTable } from "@/components/StockTable";

export default async function StockPage() {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    return <StockTable isAdmin={isAdmin} />;
}
