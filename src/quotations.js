'use strict';

const { readJSON, writeJSON, generateId } = require('./utils');
const { getSuppliersForProduct }           = require('./suppliers');
const { updateStock }                      = require('./stock');
const FILE = 'quotations.json';

// Request quotations for a product shortage, linked to an order
function requestQuotation({ productId, quantity, orderId, pricePerUnit, supplierId, validUntil }) {
  const quotations = readJSON(FILE);
  const id         = generateId('Q', quotations);
  quotations.push({
    id,
    supplierId,
    productId,
    quantity,
    pricePerUnit: parseFloat(pricePerUnit),
    validUntil,
    status: 'received',
    orderId: orderId || null
  });
  writeJSON(FILE, quotations);
  console.log(`\n✅ Quotation ${id} stored (Supplier: ${supplierId}, Product: ${productId}, Qty: ${quantity} @ ₹${pricePerUnit}/unit).`);
  return id;
}

// View all quotations (optionally filter by product or order)
function viewQuotations(filter = {}) {
  let quotations = readJSON(FILE);
  if (filter.productId) quotations = quotations.filter(q => q.productId === filter.productId);
  if (filter.orderId)   quotations = quotations.filter(q => q.orderId   === filter.orderId);
  if (!quotations.length) { console.log('\nNo quotations found.'); return; }
  console.log('\n--- Quotations ---');
  quotations.forEach(q => {
    console.log(
      `[${q.id}] Supplier: ${q.supplierId} | Product: ${q.productId} | Qty: ${q.quantity}` +
      ` | ₹${q.pricePerUnit}/unit | Valid: ${q.validUntil} | Status: ${q.status}` +
      (q.orderId ? ` | Order: ${q.orderId}` : '')
    );
  });
}

// Select the best (lowest price) quotation for a given product and order
function selectBestQuotation(productId, orderId) {
  let quotations = readJSON(FILE).filter(
    q => q.productId === productId && q.status === 'received' &&
         (orderId ? q.orderId === orderId : true)
  );
  if (!quotations.length) {
    console.log(`\nNo open quotations found for product ${productId}.`);
    return null;
  }
  quotations.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  const best = quotations[0];

  // Mark selected, reject others for same product+order
  const all = readJSON(FILE);
  all.forEach(q => {
    if (q.productId === productId && q.status === 'received' &&
        (orderId ? q.orderId === orderId : true)) {
      q.status = q.id === best.id ? 'selected' : 'rejected';
    }
  });
  writeJSON(FILE, all);

  // Update stock with the purchased quantity
  updateStock(best.productId, best.quantity);
  console.log(`\n✅ Best quotation selected: [${best.id}] from supplier ${best.supplierId} @ ₹${best.pricePerUnit}/unit.`);
  console.log(`   Stock updated: +${best.quantity} units of ${best.productId}`);
  return best;
}

// Manually select a specific quotation by ID
function selectQuotationById(quotationId) {
  const all = readJSON(FILE);
  const q   = all.find(x => x.id === quotationId);
  if (!q) { console.log(`\n❌ Quotation ${quotationId} not found.`); return null; }
  if (q.status !== 'received') { console.log(`\n❌ Quotation already ${q.status}.`); return null; }

  // Reject all other received quotations for same product+order
  all.forEach(x => {
    if (x.productId === q.productId && x.status === 'received' &&
        (q.orderId ? x.orderId === q.orderId : true)) {
      x.status = x.id === quotationId ? 'selected' : 'rejected';
    }
  });
  writeJSON(FILE, all);

  updateStock(q.productId, q.quantity);
  console.log(`\n✅ Quotation ${quotationId} selected. Stock updated: +${q.quantity} units of ${q.productId}`);
  return q;
}

module.exports = { requestQuotation, viewQuotations, selectBestQuotation, selectQuotationById };
