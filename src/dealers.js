'use strict';

const { readJSON, writeJSON, generateId } = require('./utils');
const FILE = 'dealers.json';

function addDealer({ name, contact, email, address }) {
  const dealers = readJSON(FILE);
  const id = generateId('D', dealers);
  dealers.push({ id, name, contact, email, address });
  writeJSON(FILE, dealers);
  console.log(`\n✅ Dealer added with ID: ${id}`);
}

function viewDealers() {
  const dealers = readJSON(FILE);
  if (!dealers.length) {
    console.log('\nNo dealers found.');
    return;
  }
  console.log('\n--- Dealers ---');
  dealers.forEach(d => {
    console.log(`[${d.id}] ${d.name} | ${d.contact} | ${d.email} | ${d.address}`);
  });
}

function getDealerById(id) {
  return readJSON(FILE).find(d => d.id === id);
}

module.exports = { addDealer, viewDealers, getDealerById };
