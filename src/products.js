'use strict';

const { readJSON, writeJSON, generateId } = require('./utils');
const FILE = 'products.json';

function addProduct({ name, description, price, unit }) {
  const products = readJSON(FILE);
  const id = generateId('P', products);
  products.push({ id, name, description, price: parseFloat(price), unit });
  writeJSON(FILE, products);
  console.log(`\n✅ Product added with ID: ${id}`);

  // initialise stock entry
  const stock = readJSON('stock.json');
  if (!stock.find(s => s.productId === id)) {
    stock.push({ productId: id, quantity: 0, lastUpdated: new Date().toISOString() });
    writeJSON('stock.json', stock);
  }
}

function viewProducts() {
  const products = readJSON(FILE);
  if (!products.length) {
    console.log('\nNo products found.');
    return;
  }
  console.log('\n--- Products ---');
  products.forEach(p => {
    console.log(`[${p.id}] ${p.name} | ₹${p.price}/${p.unit} | ${p.description}`);
  });
}

function getProductById(id) {
  return readJSON(FILE).find(p => p.id === id);
}

module.exports = { addProduct, viewProducts, getProductById };
