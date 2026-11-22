require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const products = [
  { name: 'Wireless Mouse', sku: 'ELEC-MS-101', category: 'Electronics', price: 799, quantity: 45, reorderLevel: 10, supplier: 'Logitech India' },
  { name: 'Mechanical Keyboard', sku: 'ELEC-KB-204', category: 'Electronics', price: 3499, quantity: 25, reorderLevel: 8, supplier: 'Keychron' },
  { name: 'USB-C Hub', sku: 'ELEC-HB-315', category: 'Electronics', price: 1999, quantity: 20, reorderLevel: 5, supplier: 'Portronics' },
  { name: '24-inch Monitor', sku: 'ELEC-MN-420', category: 'Electronics', price: 14999, quantity: 6, reorderLevel: 6, supplier: 'Dell India' },
  { name: 'Cotton T-Shirt', sku: 'APRL-TS-110', category: 'Apparel', price: 599, quantity: 60, reorderLevel: 15, supplier: 'Jockey' },
  { name: 'Denim Jacket', sku: 'APRL-JK-225', category: 'Apparel', price: 2199, quantity: 18, reorderLevel: 5, supplier: 'Levis India' },
  { name: 'Study Table', sku: 'FURN-TB-812', category: 'Furniture', price: 3999, quantity: 2, reorderLevel: 4, supplier: 'IKEA India' },
  { name: 'Office Chair', sku: 'FURN-CH-640', category: 'Furniture', price: 6499, quantity: 14, reorderLevel: 5, supplier: 'Green Soul' },
  { name: 'A5 Notebook', sku: 'STNY-NB-330', category: 'Stationery', price: 90, quantity: 12, reorderLevel: 25, supplier: 'Classmate' },
  { name: 'Gel Pen Pack of 10', sku: 'STNY-PN-712', category: 'Stationery', price: 100, quantity: 80, reorderLevel: 20, supplier: 'Cello Pens' },
  { name: 'Basmati Rice 5kg', sku: 'GROC-RC-505', category: 'Grocery', price: 649, quantity: 35, reorderLevel: 10, supplier: 'India Gate' },
  { name: 'Green Tea 100 Bags', sku: 'GROC-TE-118', category: 'Grocery', price: 450, quantity: 0, reorderLevel: 8, supplier: 'Organic India' },
];

async function seed() {
  const reset = process.argv.includes('--reset');
  await connectDB();

  const existing = await Product.countDocuments();
  if (existing && !reset) {
    console.log(`Skipped: database already has ${existing} products. Use "npm run seed:reset" to replace them.`);
    return;
  }

  if (reset) await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products.`);
}

seed()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
