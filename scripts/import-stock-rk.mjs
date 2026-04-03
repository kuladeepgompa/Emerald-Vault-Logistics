import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// TARGET WAREHOUSE ID (from mbgf)
const WAREHOUSE_ID = "69cee471149f5915b4ff47fd";

async function importData() {
    try {
        await client.connect();
        const db = client.db();
        const productCollection = db.collection('Product');

        // Read Excel
        const filePath = path.join(__dirname, '../R.K.Agencies.xlsx');
        console.log(`🚀 Reading data from ${filePath}...`);
        
        const workbook = xlsx.readFile(filePath);
        const records = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const products = records.map(row => {
            const flavour = row['Flavour'] || 'Unknown';
            const pack = row['Pack'] || 'N/A';
            const name = `${flavour} (${pack})`;
            
            // Generate basic SKU
            const base = flavour.substring(0, 3).toUpperCase();
            const pck = pack.substring(0, 3).toUpperCase();
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
            const sku = `${base}-${pck}-${random}`.replace(/ /g, "");

            return {
                name,
                sku,
                quantity: 0, // Default to 0 since sheet lacks stock counts
                price: Number(row['MRP']) || 0,
                invoiceCost: Number(row['Invoce cost']) || 0,
                pack,
                flavour,
                warehouseId: new ObjectId(WAREHOUSE_ID),
                createdAt: new Date(),
                updatedAt: new Date()
            };
        });

        if (products.length === 0) {
            console.log('⚠️ No items found in the sheet.');
            return;
        }

        console.log(`📦 Found ${products.length} items. Inserting into warehouse ID: ${WAREHOUSE_ID}...`);

        // Use bulk insert for speed
        const result = await productCollection.insertMany(products);
        console.log(`✅ Successfully imported ${result.insertedCount} products to the warehouse!`);

    } catch (err) {
        console.error('❌ Error importing data:', err);
    } finally {
        await client.close();
    }
}

importData();
