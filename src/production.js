'use strict';

const { readJSON, writeJSON } = require('./utils');
const { getStockForProduct, updateStock } = require('./stock');
const { updateOrderStatus } = require('./orders');

// Generate a production plan for a confirmed/pending order
function generateProductionPlan(orderId) {
  const orders = readJSON('orders.json');
  const order  = orders.find(o => o.id === orderId);
  if (!order) { console.log(`\n❌ Order ${orderId} not found.`); return; }
  if (!['confirmed', 'pending_stock'].includes(order.status)) {
    console.log(`\n❌ Order ${orderId} is not in a producible state (status: ${order.status}).`);
    return;
  }

  console.log(`\n--- Production Plan for Order ${orderId} ---`);
  console.log(`Dealer: ${order.dealerId}`);
  order.items.forEach(item => {
    const s    = getStockForProduct(item.productId);
    const avail = s ? s.quantity : 0;
    const need  = Math.max(0, item.quantity - avail);
    console.log(`  Product ${item.productId}: required ${item.quantity}, in stock ${avail}, to produce ${need}`);
  });

  // Mark order as in_production
  updateOrderStatus(orderId, 'in_production');
  console.log(`\n✅ Order ${orderId} moved to 'in_production'.`);
}

// Update production status for an order
function updateProductionStatus(orderId, status) {
  const validStatuses = ['in_production', 'completed'];
  if (!validStatuses.includes(status)) {
    console.log(`\n❌ Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    return;
  }
  const orders = readJSON('orders.json');
  const order  = orders.find(o => o.id === orderId);
  if (!order) { console.log(`\n❌ Order ${orderId} not found.`); return; }

  updateOrderStatus(orderId, status);
  console.log(`\n✅ Production status for order ${orderId} updated to '${status}'.`);

  if (status === 'completed') {
    // Stock was already deducted when confirmed; nothing extra needed
    console.log('   Stock was reserved at order confirmation. No further stock change needed.');
  }
}

// Add produced quantity to stock (used after a production run)
function addProducedStock(productId, qty) {
  updateStock(productId, qty);
  console.log(`\n✅ Production complete: +${qty} units of ${productId} added to stock.`);
}

module.exports = { generateProductionPlan, updateProductionStatus, addProducedStock };
