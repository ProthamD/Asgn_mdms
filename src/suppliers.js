'use strict';

const { readJSON, writeJSON, generateId } = require('./utils');
const FILE = 'suppliers.json';

function addSupplier({ name, contact, email, products }) {
  const suppliers = readJSON(FILE);
  const id        = generateId('S', suppliers);
  suppliers.push({ id, name, contact, email, products: products || [] });
  writeJSON(FILE, suppliers);
  console.log(`\n✅ Supplier added with ID: ${id}`);
}

function viewSuppliers() {
  const suppliers = readJSON(FILE);
  if (!suppliers.length) { console.log('\nNo suppliers found.'); return; }
  console.log('\n--- Suppliers ---');
  suppliers.forEach(s => {
    console.log(`[${s.id}] ${s.name} | ${s.contact} | ${s.email} | Products: ${s.products.join(', ')}`);
  });
}

function getSupplierById(id) {
  return readJSON(FILE).find(s => s.id === id);
}

function getSuppliersForProduct(productId) {
  return readJSON(FILE).filter(s => s.products.includes(productId));
}

module.exports = { addSupplier, viewSuppliers, getSupplierById, getSuppliersForProduct };
