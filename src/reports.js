'use strict';

const { readJSON } = require('./utils');

function printReports() {
  const orders   = readJSON('orders.json');
  const products = readJSON('products.json');
  const stock    = readJSON('stock.json');

  const sep = '═'.repeat(60);

  // ── Total Sales ──────────────────────────────────────────────
  const completed = orders.filter(o => o.status === 'completed' && o.invoice);
  const totalSales = completed.reduce((sum, o) => sum + (o.invoice.grandTotal || 0), 0);
  console.log(`\n${sep}`);
  console.log('  REPORT: Total Sales');
  console.log(sep);
  if (!completed.length) {
    console.log('  No completed orders with invoices yet.');
  } else {
    completed.forEach(o => {
      console.log(`  Order ${o.id} | Dealer: ${o.dealerId} | ₹${o.invoice.grandTotal}`);
    });
    console.log(`  ──────────────────────────────────────`);
    console.log(`  Total Revenue (incl. GST): ₹${totalSales.toFixed(2)}`);
  }

  // ── Stock Status ──────────────────────────────────────────────
  console.log(`\n${sep}`);
  console.log('  REPORT: Stock Status');
  console.log(sep);
  if (!stock.length) {
    console.log('  No stock data.');
  } else {
    stock.forEach(s => {
      const p    = products.find(x => x.id === s.productId);
      const name = p ? p.name : s.productId;
      const flag = s.quantity < 20 ? ' ⚠️  LOW' : '';
      console.log(`  ${name.padEnd(20)} (${s.productId}): ${s.quantity} unit(s)${flag}`);
    });
  }

  // ── Pending Orders ────────────────────────────────────────────
  console.log(`\n${sep}`);
  console.log('  REPORT: Pending / Active Orders');
  console.log(sep);
  const active = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
  if (!active.length) {
    console.log('  No pending orders.');
  } else {
    active.forEach(o => {
      const itemsSummary = o.items.map(i => `${i.productId}×${i.quantity}`).join(', ');
      console.log(`  [${o.id}] Dealer: ${o.dealerId} | ${itemsSummary} | Status: ${o.status}`);
    });
  }
  console.log(`${sep}\n`);
}

module.exports = { printReports };
