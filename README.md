# Warehouse Management System (WMS)

A robust, modern Warehouse Management System built to handle multi-godown stock environments, pricing overrides, trip management, and vehicle dispatching.

## 🚀 Key Features

*   **Multi-Warehouse Support:** Create and seamlessly switch between multiple warehouses and godowns under one centralized system. 
*   **Role-Based Access Control (RBAC):** Automatic assignment of administrative (`ADMIN`) and restricted (`STAFF`) roles based on initial sign-up, enforced by server-side verification.
*   **Dynamic Inventory Tracking:** Add specific quantities to existing SKUs, register completely new products (variants by pack and flavour), and delete items based on administrative permissions.
*   **Daily Pricing Engine:** Set dynamic base (`Sale Price`) and bulk `Invoice Costs`. Admins can place temporary `Daily Price` overrides on items that immediately reflect stock profitability metrics.
*   **Trip & Manifest Management:** Deploy vehicles with customizable load manifests. The system auto-calculates the Load Cost and Estimated Profit directly inside the loading bay UI.
*   **Excel Data Integration:** Import pricing and stock directly from XLSX files utilizing specialized backend scripts.

## 🛠️ Tech Stack

*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript
*   **Database:** MongoDB
*   **Authentication:** NextAuth.js (Google OAuth configuration)
*   **Styling:** Tailwind CSS v4

## 📦 Getting Started

### Prerequisites

Ensure you have Node.js and MongoDB installed or a valid MongoDB Atlas URI. 

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add the following keys:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_SECRET=your_nextauth_secret
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```

4. **Initialize Admin:**
   The very first Google account to sign into the system via `localhost:3000` will automatically be granted the `ADMIN` role. All subsequent sign-ups will be designated as `STAFF`.

## 🗃️ Bulk Import Scripts

To process and update stock prices in bulk based on supplier data, use the provided import scripts found in the `scripts/` directory:

```bash
node scripts/import-stock-rk.mjs
```
*(Ensure `selling_price.xlsx` is properly formatted in the project root before executing the import)*
