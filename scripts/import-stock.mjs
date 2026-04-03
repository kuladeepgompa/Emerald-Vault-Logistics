import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the parent directory (project root)
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function importData() {
    try {
        await client.connect();
        const db = client.db(); // Uses database from URI
        const productsCollection = db.collection('products');

        // Read the Excel file
        const filePath = path.join(__dirname, '../R.K.Agencies.xlsx');
        console.log(`Reading data from ${filePath}...`);
        
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const records = xlsx.utils.sheet_to_json(sheet);

        const products = records.map(row => ({
            name: row['Item Name'],
            category: row['Company'] || 'General',
            quantity: Number(row['Stock']) || 0,
            price: Number(row['Sale Price']) || 0,
            minStock: 5, // Defaulting to 5 for your low-stock alerts
            updatedAt: new Date()
        }));

        console.log(`Found ${products.length} products to import. Inserting into MongoDB...`);

        if (products.length === 0) {
            console.log('No products found in the sheet. Exiting.');
            return;
        }

        // Insert into MongoDB
        const result = await productsCollection.insertMany(products);
        console.log(`✅ Successfully imported ${result.insertedCount} products!`);

    } catch (err) {
        console.error('❌ Error importing data:', err);
    } finally {
        await client.close();
    }
}

importData();