#!/usr/bin/env node
'use strict';

const readline = require('readline');

const dealers    = require('./src/dealers');
const products   = require('./src/products');
const stock      = require('./src/stock');
const orders     = require('./src/orders');
const suppliers  = require('./src/suppliers');
const quotations = require('./src/quotations');
const production = require('./src/production');
const billing    = require('./src/billing');
const reports    = require('./src/reports');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function askItems() {
  const items = [];
  while (true) {
    const productId = (await ask('  Product ID (or blank to finish): ')).trim();
    if (!productId) break;
    const qty = parseInt(await ask('  Quantity: '), 10);
    if (isNaN(qty) || qty <= 0) { console.log('  Invalid quantity, skipping.'); continue; }
    items.push({ productId, quantity: qty });
  }
  return items;
}

// ─────────────────────────────────────────────────────────────
//  MENUS
// ─────────────────────────────────────────────────────────────

async function dealerMenu() {
  while (true) {
    console.log('\n── Dealer Management ──');
    console.log('  1. Add Dealer');
    console.log('  2. View Dealers');
    console.log('  0. Back');
    const choice = (await ask('Choice: ')).trim();
    if (choice === '1') {
      const name    = await ask('Name: ');
      const contact = await ask('Contact: ');
      const email   = await ask('Email: ');
      const address = await ask('Address: ');
      dealers.addDealer({ name, contact, email, address });
    } else if (choice === '2') {
      dealers.viewDealers();
    } else if (choice === '0') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }
}

async function productMenu() {
  while (true) {
    console.log('\n── Product & Stock Management ──');
    console.log('  1. Add Product');
    console.log('  2. View Products');
    console.log('  3. View Stock');
    console.log('  4. Set Stock Quantity');
    console.log('  0. Back');
    const choice = (await ask('Choice: ')).trim();
    if (choice === '1') {
      const name        = await ask('Product Name: ');
      const description = await ask('Description: ');
      const price       = await ask('Price per unit (₹): ');
      const unit        = await ask('Unit (e.g. piece, meter, kg): ');
      products.addProduct({ name, description, price, unit });
    } else if (choice === '2') {
      products.viewProducts();
    } else if (choice === '3') {
      stock.viewStock();
    } else if (choice === '4') {
      const productId = (await ask('Product ID: ')).trim();
      const qty       = parseInt(await ask('New quantity: '), 10);
      stock.setStock(productId, qty);
    } else if (choice === '0') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }
}

async function orderMenu() {
  while (true) {
    console.log('\n── Dealer Orders ──');
    console.log('  1. Create Order');
    console.log('  2. Modify Order');
    console.log('  3. Cancel Order');
    console.log('  4. View All Orders');
    console.log('  0. Back');
    const choice = (await ask('Choice: ')).trim();
    if (choice === '1') {
      dealers.viewDealers();
      const dealerId = (await ask('Dealer ID: ')).trim();
      console.log('Enter order items:');
      const items = await askItems();
      if (items.length) orders.createOrder(dealerId, items);
      else console.log('No items entered.');
    } else if (choice === '2') {
      orders.viewOrders();
      const orderId = (await ask('Order ID to modify: ')).trim();
      console.log('Enter new items:');
      const newItems = await askItems();
      if (newItems.length) orders.modifyOrder(orderId, newItems);
      else console.log('No items entered.');
    } else if (choice === '3') {
      orders.viewOrders();
      const orderId = (await ask('Order ID to cancel: ')).trim();
      orders.cancelOrder(orderId);
    } else if (choice === '4') {
      orders.viewOrders();
    } else if (choice === '0') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }
}

async function supplierMenu() {
  while (true) {
    console.log('\n── Suppliers & Quotations ──');
    console.log('  1. Add Supplier');
    console.log('  2. View Suppliers');
    console.log('  3. Store Quotation');
    console.log('  4. View Quotations');
    console.log('  5. Select Best Quotation (auto, lowest price)');
    console.log('  6. Select Quotation by ID');
    console.log('  0. Back');
    const choice = (await ask('Choice: ')).trim();
    if (choice === '1') {
      const name    = await ask('Supplier Name: ');
      const contact = await ask('Contact: ');
      const email   = await ask('Email: ');
      const prodIds = await ask('Product IDs supplied (comma-separated): ');
      const prods   = prodIds.split(',').map(s => s.trim()).filter(Boolean);
      suppliers.addSupplier({ name, contact, email, products: prods });
    } else if (choice === '2') {
      suppliers.viewSuppliers();
    } else if (choice === '3') {
      suppliers.viewSuppliers();
      const supplierId  = (await ask('Supplier ID: ')).trim();
      products.viewProducts();
      const productId   = (await ask('Product ID: ')).trim();
      const quantity    = parseInt(await ask('Quantity: '), 10);
      const pricePerUnit = await ask('Price per unit (₹): ');
      const validUntil  = await ask('Valid until (YYYY-MM-DD): ');
      const orderId     = (await ask('Order ID (or blank): ')).trim();
      quotations.requestQuotation({
        productId, quantity, orderId: orderId || null, pricePerUnit, supplierId, validUntil
      });
    } else if (choice === '4') {
      const filterProd  = (await ask('Filter by Product ID (or blank): ')).trim();
      const filterOrder = (await ask('Filter by Order ID (or blank): ')).trim();
      quotations.viewQuotations({
        productId: filterProd  || undefined,
        orderId:   filterOrder || undefined
      });
    } else if (choice === '5') {
      products.viewProducts();
      const productId = (await ask('Product ID: ')).trim();
      const orderId   = (await ask('Order ID (or blank for any): ')).trim();
      quotations.selectBestQuotation(productId, orderId || undefined);
    } else if (choice === '6') {
      quotations.viewQuotations({});
      const qid = (await ask('Quotation ID: ')).trim();
      quotations.selectQuotationById(qid);
    } else if (choice === '0') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }
}

async function productionMenu() {
  while (true) {
    console.log('\n── Production ──');
    console.log('  1. Generate Production Plan for Order');
    console.log('  2. Update Production Status');
    console.log('  3. Add Produced Stock');
    console.log('  0. Back');
    const choice = (await ask('Choice: ')).trim();
    if (choice === '1') {
      orders.viewOrders();
      const orderId = (await ask('Order ID: ')).trim();
      production.generateProductionPlan(orderId);
    } else if (choice === '2') {
      orders.viewOrders();
      const orderId = (await ask('Order ID: ')).trim();
      console.log('  Statuses: in_production, completed');
      const status  = (await ask('New status: ')).trim();
      production.updateProductionStatus(orderId, status);
    } else if (choice === '3') {
      products.viewProducts();
      const productId = (await ask('Product ID: ')).trim();
      const qty       = parseInt(await ask('Quantity produced: '), 10);
      production.addProducedStock(productId, qty);
    } else if (choice === '0') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }
}

async function billingMenu() {
  while (true) {
    console.log('\n── Billing ──');
    console.log('  1. Generate Invoice for Order');
    console.log('  0. Back');
    const choice = (await ask('Choice: ')).trim();
    if (choice === '1') {
      orders.viewOrders();
      const orderId = (await ask('Order ID: ')).trim();
      billing.generateInvoice(orderId);
    } else if (choice === '0') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  MAIN MENU
// ─────────────────────────────────────────────────────────────

async function mainMenu() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Manufacturing & Dealer Management System ║');
  console.log('╚══════════════════════════════════════════╝');

  while (true) {
    console.log('\n═══ Main Menu ═══');
    console.log('  1. Dealer Management');
    console.log('  2. Product & Stock Management');
    console.log('  3. Dealer Orders');
    console.log('  4. Suppliers & Quotations');
    console.log('  5. Production');
    console.log('  6. Billing');
    console.log('  7. Reports');
    console.log('  0. Exit');
    const choice = (await ask('\nChoice: ')).trim();
    switch (choice) {
      case '1': await dealerMenu();      break;
      case '2': await productMenu();     break;
      case '3': await orderMenu();       break;
      case '4': await supplierMenu();    break;
      case '5': await productionMenu();  break;
      case '6': await billingMenu();     break;
      case '7': reports.printReports();  break;
      case '0':
        console.log('\nGoodbye!\n');
        rl.close();
        process.exit(0);
      default:
        console.log('Invalid choice.');
    }
  }
}

mainMenu().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
