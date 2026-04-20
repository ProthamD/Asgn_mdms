'use strict';

const { readJSON, writeJSON, generateId } = require('./utils');
const { getStockForProduct, updateStock }  = require('./stock');
const ORDERS_FILE = 'orders.json';

// items: [{productId, quantity}]
function createOrder(dealerId, items) {
  const orders = readJSON(ORDERS_FILE);
  const id     = generateId('ORD', orders);

  // Check stock for each item
  const shortages = [];
  items.forEach(item => {
    const stockEntry = getStockForProduct(item.productId);
    const available  = stockEntry ? stockEntry.quantity : 0;
    if (available < item.quantity) {
      shortages.push({ productId: item.productId, required: item.quantity, available });
    }
  });

  const now   = new Date().toISOString();
  const order = {
    id,
    dealerId,
    items,
    status: shortages.length ? 'pending_stock' : 'confirmed',
    createdAt: now,
    updatedAt: now,
    invoice: null
  };

  orders.push(order);
  writeJSON(ORDERS_FILE, orders);

  if (shortages.length) {
    console.log(`\n⚠️  Order ${id} created with status 'pending_stock'. Shortages:`);
    shortages.forEach(s =>
      console.log(`   ${s.productId}: required ${s.required}, available ${s.available}`)
    );
    console.log('   → Please request supplier quotations to cover the shortage.');
  } else {
    console.log(`\n✅ Order ${id} created with status 'confirmed'.`);
    // Deduct stock
    items.forEach(item => updateStock(item.productId, -item.quantity));
  }
  return id;
}

function modifyOrder(orderId, newItems) {
  const orders = readJSON(ORDERS_FILE);
  const order  = orders.find(o => o.id === orderId);
  if (!order) { console.log(`\n❌ Order ${orderId} not found.`); return; }
  if (['completed', 'cancelled'].includes(order.status)) {
    console.log(`\n❌ Cannot modify a ${order.status} order.`); return;
  }

  // Restore previously deducted stock if order was confirmed
  if (order.status === 'confirmed') {
    order.items.forEach(item => updateStock(item.productId, item.quantity));
  }

  const shortages = [];
  newItems.forEach(item => {
    const stockEntry = getStockForProduct(item.productId);
    const available  = stockEntry ? stockEntry.quantity : 0;
    if (available < item.quantity) {
      shortages.push({ productId: item.productId, required: item.quantity, available });
    }
  });

  order.items     = newItems;
  order.status    = shortages.length ? 'pending_stock' : 'confirmed';
  order.updatedAt = new Date().toISOString();
  writeJSON(ORDERS_FILE, orders);

  if (!shortages.length) {
    newItems.forEach(item => updateStock(item.productId, -item.quantity));
    console.log(`\n✅ Order ${orderId} modified and confirmed.`);
  } else {
    console.log(`\n⚠️  Order ${orderId} modified but stock insufficient. Shortages:`);
    shortages.forEach(s =>
      console.log(`   ${s.productId}: required ${s.required}, available ${s.available}`)
    );
  }
}

function cancelOrder(orderId) {
  const orders = readJSON(ORDERS_FILE);
  const order  = orders.find(o => o.id === orderId);
  if (!order) { console.log(`\n❌ Order ${orderId} not found.`); return; }
  if (order.status === 'cancelled') { console.log(`\nOrder already cancelled.`); return; }
  if (order.status === 'completed') { console.log(`\n❌ Cannot cancel a completed order.`); return; }

  // Restore stock if items were deducted
  if (order.status === 'confirmed' || order.status === 'in_production') {
    order.items.forEach(item => updateStock(item.productId, item.quantity));
  }

  order.status    = 'cancelled';
  order.updatedAt = new Date().toISOString();
  writeJSON(ORDERS_FILE, orders);
  console.log(`\n✅ Order ${orderId} cancelled.`);
}

function viewOrders() {
  const orders = readJSON(ORDERS_FILE);
  if (!orders.length) { console.log('\nNo orders found.'); return; }
  console.log('\n--- Orders ---');
  orders.forEach(o => {
    const itemsSummary = o.items.map(i => `${i.productId}×${i.quantity}`).join(', ');
    console.log(`[${o.id}] Dealer: ${o.dealerId} | Items: ${itemsSummary} | Status: ${o.status} | Created: ${o.createdAt}`);
  });
}

function getOrderById(id) {
  return readJSON(ORDERS_FILE).find(o => o.id === id);
}

function updateOrderStatus(orderId, status) {
  const orders = readJSON(ORDERS_FILE);
  const order  = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status    = status;
  order.updatedAt = new Date().toISOString();
  writeJSON(ORDERS_FILE, orders);
}

function saveOrderInvoice(orderId, invoice) {
  const orders = readJSON(ORDERS_FILE);
  const order  = orders.find(o => o.id === orderId);
  if (!order) return;
  order.invoice   = invoice;
  order.status    = 'completed';
  order.updatedAt = new Date().toISOString();
  writeJSON(ORDERS_FILE, orders);
}

module.exports = {
  createOrder,
  modifyOrder,
  cancelOrder,
  viewOrders,
  getOrderById,
  updateOrderStatus,
  saveOrderInvoice
};
