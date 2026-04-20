'use strict';

const { readJSON, writeJSON } = require('./utils');
const STOCK_FILE = 'stock.json';

function viewStock() {
  const stock    = readJSON(STOCK_FILE);
  const products = readJSON('products.json');
  console.log('\n--- Current Stock ---');
  if (!stock.length) {
    console.log('No stock records found.');
    return;
  }
  stock.forEach(s => {
    const p = products.find(x => x.id === s.productId);
    const name = p ? p.name : s.productId;
    console.log(`${name} (${s.productId}): ${s.quantity} ${p ? p.unit + '(s)' : 'unit(s)'} — last updated ${s.lastUpdated}`);
  });
}

function getStockForProduct(productId) {
  const stock = readJSON(STOCK_FILE);
  return stock.find(s => s.productId === productId);
}

function updateStock(productId, deltaQty) {
  const stock = readJSON(STOCK_FILE);
  let entry = stock.find(s => s.productId === productId);
  if (!entry) {
    entry = { productId, quantity: 0, lastUpdated: new Date().toISOString() };
    stock.push(entry);
  }
  entry.quantity  += deltaQty;
  if (entry.quantity < 0) entry.quantity = 0;
  entry.lastUpdated = new Date().toISOString();
  writeJSON(STOCK_FILE, stock);
}

function setStock(productId, qty) {
  const stock = readJSON(STOCK_FILE);
  let entry = stock.find(s => s.productId === productId);
  if (!entry) {
    entry = { productId, quantity: 0, lastUpdated: new Date().toISOString() };
    stock.push(entry);
  }
  entry.quantity    = qty;
  entry.lastUpdated = new Date().toISOString();
  writeJSON(STOCK_FILE, stock);
  console.log(`\n✅ Stock updated: ${productId} → ${qty} units`);
}

module.exports = { viewStock, getStockForProduct, updateStock, setStock };
