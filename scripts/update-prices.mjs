import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function updatePrices() {
    try {
        await client.connect();
        const db = client.db();
        const productCollection = db.collection('Product');

        const filePath = path.join(__dirname, '../selling_price.xlsx');
        console.log(`🚀 Reading data from ${filePath}...`);
        
        const workbook = xlsx.readFile(filePath);
        const records = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        let matched = 0;
        let modified = 0;
        let notFound = 0;

        for (const row of records) {
            const pack = row['Pack']?.toString().trim();
            const flavour = row['Flavour']?.toString().trim();
            const invoiceCost = Number(row['Invoce cost']);
            let salePrice = Number(row['sale price']);
            
            // if "sale price" isn't present, we could optionally try other columns like "Sale price", "Sale Price"
            if (isNaN(salePrice)) {
                salePrice = Number(row[' sale price '] || row['Sale Price']);
            }

            if (!pack || !flavour) continue;

            // Find matching product(s) by pack and flavour
            // We update across all warehouses
            const result = await productCollection.updateMany(
                { 
                    "pack": pack, 
                    "flavour": flavour 
                },
                { 
                    $set: { 
                        invoiceCost: !isNaN(invoiceCost) ? invoiceCost : null,
                        salePrice: !isNaN(salePrice) ? salePrice : null
                    } 
                }
            );

            if (result.matchedCount > 0) {
                matched += result.matchedCount;
                modified += result.modifiedCount;
            } else {
                notFound++;
                console.log(`⚠️ No product found for Pack: ${pack}, Flavour: ${flavour}`);
            }
        }

        console.log(`✅ Update complete!`);
        console.log(`   - Matched Products: ${matched}`);
        console.log(`   - Modified Products: ${modified}`);
        console.log(`   - Excel Rows with no matching product: ${notFound}`);

    } catch (err) {
        console.error('❌ Error updating prices:', err);
    } finally {
        await client.close();
    }
}

updatePrices();
