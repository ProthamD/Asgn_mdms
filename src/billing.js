'use strict';

const { generateId } = require('./utils');
const { getOrderById, saveOrderInvoice } = require('./orders');
const { getProductById }                 = require('./products');
const { getDealerById }                  = require('./dealers');

function generateInvoice(orderId) {
  const order = getOrderById(orderId);
  if (!order) { console.log(`\n❌ Order ${orderId} not found.`); return; }
  if (order.status === 'cancelled') { console.log(`\n❌ Cannot invoice a cancelled order.`); return; }
  if (order.invoice) {
    console.log(`\nℹ️  Invoice already exists for order ${orderId}: ${order.invoice.invoiceId}`);
    printInvoice(order.invoice, order);
    return;
  }

  const dealer    = getDealerById(order.dealerId);
  const lineItems = order.items.map(item => {
    const product = getProductById(item.productId);
    const price   = product ? product.price : 0;
    return {
      productId:   item.productId,
      productName: product ? product.name : item.productId,
      quantity:    item.quantity,
      pricePerUnit: price,
      total:        price * item.quantity
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
  const tax      = parseFloat((subtotal * 0.18).toFixed(2));   // 18% GST
  const grandTotal = parseFloat((subtotal + tax).toFixed(2));

  const invoice = {
    invoiceId:   `INV${String(Date.now()).slice(-6)}`,
    orderId,
    dealerId:    order.dealerId,
    dealerName:  dealer ? dealer.name : order.dealerId,
    lineItems,
    subtotal,
    tax,
    grandTotal,
    generatedAt: new Date().toISOString()
  };

  saveOrderInvoice(orderId, invoice);
  printInvoice(invoice, order);
}

function printInvoice(invoice, order) {
  const sep = '─'.repeat(60);
  console.log(`\n${sep}`);
  console.log(`INVOICE: ${invoice.invoiceId}   Order: ${invoice.orderId}`);
  console.log(`Dealer : ${invoice.dealerName} (${invoice.dealerId})`);
  console.log(`Date   : ${invoice.generatedAt}`);
  console.log(sep);
  console.log(`${'Product'.padEnd(20)} ${'Qty'.padStart(6)} ${'Price'.padStart(10)} ${'Total'.padStart(12)}`);
  console.log(sep);
  invoice.lineItems.forEach(li => {
    console.log(
      `${li.productName.padEnd(20)} ${String(li.quantity).padStart(6)}` +
      ` ${('₹'+li.pricePerUnit).padStart(10)} ${('₹'+li.total).padStart(12)}`
    );
  });
  console.log(sep);
  console.log(`${'Subtotal'.padEnd(38)} ${('₹'+invoice.subtotal).padStart(12)}`);
  console.log(`${'GST (18%)'.padEnd(38)} ${('₹'+invoice.tax).padStart(12)}`);
  console.log(`${'Grand Total'.padEnd(38)} ${('₹'+invoice.grandTotal).padStart(12)}`);
  console.log(`${sep}\n`);
}

module.exports = { generateInvoice };
