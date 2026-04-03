import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'R.K.Agencies.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

console.log(JSON.stringify(data.slice(0, 5), null, 2));
