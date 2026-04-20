'use strict';

// ─── Data layer (localStorage) ────────────────────────────────────────────────

const DB = {
  read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (_) { return []; }
  },
  write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  generateId(prefix, collection) {
    const nums = collection
      .map(item => parseInt(item.id.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  }
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Toast ────────────────────────────────────────────────────────────────────

let _toastTimer;
function toast(msg, type) {
  type = type || 'success';
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show t-' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3500);
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
      refreshPanel(btn.dataset.tab);
    });
  });
}

function refreshPanel(tab) {
  switch (tab) {
    case 'dealers':    renderDealers();    break;
    case 'products':   renderProducts();   break;
    case 'stock':
      renderStock();
      populateStockProductSelect();
      break;
    case 'orders':
      renderOrders();
      populateDealerSelects();
      populateOrderItemProductSelects('order-items');
      break;
    case 'suppliers':  renderSuppliers();  break;
    case 'quotations':
      renderQuotations();
      populateQuotationSelects();
      break;
    case 'production':
      renderOrders();
      populateProductionProductSelect();
      break;
    case 'billing':    break;
    case 'reports':    renderReports();    break;
  }
}

// ─── DEALERS ──────────────────────────────────────────────────────────────────

function addDealer(data) {
  const dealers = DB.read('dealers');
  const id = DB.generateId('D', dealers);
  dealers.push({ id: id, name: data.name, contact: data.contact, email: data.email, address: data.address });
  DB.write('dealers', dealers);
  return id;
}

function renderDealers() {
  const dealers = DB.read('dealers');
  const tbody = document.querySelector('#dealers-table tbody');
  if (!tbody) return;
  if (!dealers.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No dealers yet. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = dealers.map(function(d) {
    return '<tr>'
      + '<td>' + esc(d.id) + '</td>'
      + '<td>' + esc(d.name) + '</td>'
      + '<td>' + esc(d.contact) + '</td>'
      + '<td>' + esc(d.email) + '</td>'
      + '<td>' + esc(d.address) + '</td>'
      + '</tr>';
  }).join('');
}

function initDealers() {
  document.getElementById('add-dealer-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var f = e.target;
    var name    = f.querySelector('[name=name]').value.trim();
    var contact = f.querySelector('[name=contact]').value.trim();
    var email   = f.querySelector('[name=email]').value.trim();
    var address = f.querySelector('[name=address]').value.trim();
    if (!name) { toast('Dealer name is required', 'error'); return; }
    var id = addDealer({ name: name, contact: contact, email: email, address: address });
    toast('✅ Dealer added: ' + id);
    f.reset();
    renderDealers();
    populateDealerSelects();
  });
  renderDealers();
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

function addProduct(data) {
  var products = DB.read('products');
  var id = DB.generateId('P', products);
  var price = parseFloat(data.price);
  products.push({ id: id, name: data.name, description: data.description, price: price, unit: data.unit });
  DB.write('products', products);
  // Initialise stock entry
  var stock = DB.read('stock');
  if (!stock.find(function(s) { return s.productId === id; })) {
    stock.push({ productId: id, quantity: 0, lastUpdated: new Date().toISOString() });
    DB.write('stock', stock);
  }
  return id;
}

function renderProducts() {
  var products = DB.read('products');
  var tbody = document.querySelector('#products-table tbody');
  if (!tbody) return;
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No products yet. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(function(p) {
    return '<tr>'
      + '<td>' + esc(p.id) + '</td>'
      + '<td>' + esc(p.name) + '</td>'
      + '<td>' + esc(p.description) + '</td>'
      + '<td>₹' + Number(p.price).toFixed(2) + '</td>'
      + '<td>' + esc(p.unit) + '</td>'
      + '</tr>';
  }).join('');
}

function initProducts() {
  document.getElementById('add-product-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var f = e.target;
    var name        = f.querySelector('[name=name]').value.trim();
    var description = f.querySelector('[name=description]').value.trim();
    var price       = f.querySelector('[name=price]').value.trim();
    var unit        = f.querySelector('[name=unit]').value.trim();
    if (!name || !price) { toast('Name and price are required', 'error'); return; }
    var id = addProduct({ name: name, description: description, price: price, unit: unit });
    toast('✅ Product added: ' + id);
    f.reset();
    renderProducts();
    populateAllProductSelects();
  });
  renderProducts();
}

// ─── STOCK ────────────────────────────────────────────────────────────────────

function getStockForProduct(productId) {
  return DB.read('stock').find(function(s) { return s.productId === productId; });
}

function updateStock(productId, delta) {
  var stock = DB.read('stock');
  var entry = stock.find(function(s) { return s.productId === productId; });
  if (!entry) {
    entry = { productId: productId, quantity: 0, lastUpdated: new Date().toISOString() };
    stock.push(entry);
  }
  entry.quantity = Math.max(0, entry.quantity + delta);
  entry.lastUpdated = new Date().toISOString();
  DB.write('stock', stock);
}

function setStock(productId, qty) {
  var stock = DB.read('stock');
  var entry = stock.find(function(s) { return s.productId === productId; });
  if (!entry) {
    entry = { productId: productId, quantity: 0, lastUpdated: new Date().toISOString() };
    stock.push(entry);
  }
  entry.quantity = qty;
  entry.lastUpdated = new Date().toISOString();
  DB.write('stock', stock);
}

function renderStock() {
  var stock    = DB.read('stock');
  var products = DB.read('products');
  var tbody = document.querySelector('#stock-table tbody');
  if (!tbody) return;
  if (!stock.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No stock records yet.</td></tr>';
    return;
  }
  tbody.innerHTML = stock.map(function(s) {
    var p    = products.find(function(x) { return x.id === s.productId; });
    var name = p ? p.name : s.productId;
    var unit = p ? p.unit : 'unit';
    var low  = s.quantity < 20;
    return '<tr>'
      + '<td>' + esc(s.productId) + '</td>'
      + '<td>' + esc(name) + '</td>'
      + '<td>' + s.quantity + ' ' + esc(unit) + '(s)</td>'
      + '<td><span class="badge badge-' + (low ? 'low' : 'ok') + '">' + (low ? '⚠ LOW' : 'OK') + '</span></td>'
      + '<td>' + new Date(s.lastUpdated).toLocaleString() + '</td>'
      + '</tr>';
  }).join('');
}

function populateStockProductSelect() {
  var products = DB.read('products');
  var opts = products.map(function(p) {
    return '<option value="' + esc(p.id) + '">' + esc(p.id) + ' – ' + esc(p.name) + '</option>';
  }).join('');
  var sel = document.getElementById('stock-product-select');
  if (sel) sel.innerHTML = '<option value="">Select product…</option>' + opts;
}

function initStock() {
  document.getElementById('set-stock-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var productId = document.getElementById('stock-product-select').value;
    var qty = parseInt(e.target.querySelector('[name=qty]').value, 10);
    if (!productId) { toast('Select a product', 'error'); return; }
    if (isNaN(qty) || qty < 0) { toast('Enter a valid quantity', 'error'); return; }
    setStock(productId, qty);
    toast('✅ Stock updated: ' + productId + ' → ' + qty);
    renderStock();
  });
  populateStockProductSelect();
  renderStock();
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

function createOrder(dealerId, items) {
  var orders = DB.read('orders');
  var id = DB.generateId('ORD', orders);
  var shortages = [];
  items.forEach(function(item) {
    var s = getStockForProduct(item.productId);
    var avail = s ? s.quantity : 0;
    if (avail < item.quantity) {
      shortages.push({ productId: item.productId, required: item.quantity, available: avail });
    }
  });
  var now = new Date().toISOString();
  var order = {
    id: id,
    dealerId: dealerId,
    items: items,
    status: shortages.length ? 'pending_stock' : 'confirmed',
    createdAt: now,
    updatedAt: now,
    invoice: null
  };
  orders.push(order);
  DB.write('orders', orders);
  if (!shortages.length) {
    items.forEach(function(item) { updateStock(item.productId, -item.quantity); });
    toast('✅ Order ' + id + ' confirmed');
  } else {
    var msgs = shortages.map(function(s) {
      return s.productId + ': need ' + s.required + ', have ' + s.available;
    }).join('; ');
    toast('⚠️ Order ' + id + ' pending stock. ' + msgs, 'warning');
  }
  return id;
}

function modifyOrder(orderId, newItems) {
  var orders = DB.read('orders');
  var order  = orders.find(function(o) { return o.id === orderId; });
  if (!order) { toast('Order ' + orderId + ' not found', 'error'); return; }
  if (order.status === 'completed' || order.status === 'cancelled') {
    toast('Cannot modify a ' + order.status + ' order', 'error'); return;
  }
  if (order.status === 'confirmed') {
    order.items.forEach(function(item) { updateStock(item.productId, item.quantity); });
  }
  var shortages = [];
  newItems.forEach(function(item) {
    var s = getStockForProduct(item.productId);
    var avail = s ? s.quantity : 0;
    if (avail < item.quantity) {
      shortages.push({ productId: item.productId, required: item.quantity, available: avail });
    }
  });
  order.items     = newItems;
  order.status    = shortages.length ? 'pending_stock' : 'confirmed';
  order.updatedAt = new Date().toISOString();
  DB.write('orders', orders);
  if (!shortages.length) {
    newItems.forEach(function(item) { updateStock(item.productId, -item.quantity); });
    toast('✅ Order ' + orderId + ' modified and confirmed');
  } else {
    toast('⚠️ Order ' + orderId + ' modified — stock insufficient', 'warning');
  }
}

function cancelOrder(orderId) {
  var orders = DB.read('orders');
  var order  = orders.find(function(o) { return o.id === orderId; });
  if (!order) { toast('Order ' + orderId + ' not found', 'error'); return; }
  if (order.status === 'cancelled')  { toast('Order already cancelled', 'warning'); return; }
  if (order.status === 'completed')  { toast('Cannot cancel a completed order', 'error'); return; }
  if (order.status === 'confirmed' || order.status === 'in_production') {
    order.items.forEach(function(item) { updateStock(item.productId, item.quantity); });
  }
  order.status    = 'cancelled';
  order.updatedAt = new Date().toISOString();
  DB.write('orders', orders);
  toast('✅ Order ' + orderId + ' cancelled');
}

function updateOrderStatus(orderId, status) {
  var orders = DB.read('orders');
  var order  = orders.find(function(o) { return o.id === orderId; });
  if (!order) return;
  order.status    = status;
  order.updatedAt = new Date().toISOString();
  DB.write('orders', orders);
}

function renderOrders() {
  var orders  = DB.read('orders');
  var dealers = DB.read('dealers');

  var html;
  if (!orders.length) {
    html = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No orders yet.</td></tr>';
  } else {
    html = orders.map(function(o) {
      var dealer     = dealers.find(function(d) { return d.id === o.dealerId; });
      var dealerName = dealer ? dealer.name : o.dealerId;
      var items      = o.items.map(function(i) { return esc(i.productId) + '×' + i.quantity; }).join(', ');
      return '<tr>'
        + '<td>' + esc(o.id) + '</td>'
        + '<td>' + esc(dealerName) + '</td>'
        + '<td>' + items + '</td>'
        + '<td><span class="badge badge-' + esc(o.status) + '">' + esc(o.status) + '</span></td>'
        + '<td>' + new Date(o.createdAt).toLocaleDateString() + '</td>'
        + '</tr>';
    }).join('');
  }

  ['orders-table', 'production-orders-table'].forEach(function(tableId) {
    var tbody = document.querySelector('#' + tableId + ' tbody');
    if (tbody) tbody.innerHTML = html;
  });
}

function populateDealerSelects() {
  var dealers = DB.read('dealers');
  var opts = dealers.map(function(d) {
    return '<option value="' + esc(d.id) + '">' + esc(d.id) + ' – ' + esc(d.name) + '</option>';
  }).join('');
  document.querySelectorAll('.dealer-select').forEach(function(sel) {
    sel.innerHTML = '<option value="">Select dealer…</option>' + opts;
  });
  var oSel = document.getElementById('order-dealer-select');
  if (oSel) oSel.innerHTML = '<option value="">Select dealer…</option>' + opts;
}

// Order items rows
var _itemCount = 0;

function buildProductOptions(selectedId) {
  var products = DB.read('products');
  var opts = products.map(function(p) {
    var sel = selectedId && p.id === selectedId ? ' selected' : '';
    return '<option value="' + esc(p.id) + '"' + sel + '>' + esc(p.id) + ' – ' + esc(p.name) + '</option>';
  }).join('');
  return '<option value="">Select product…</option>' + opts;
}

function addOrderItemRow(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var idx = _itemCount++;
  var div = document.createElement('div');
  div.className = 'item-row';
  div.dataset.idx = idx;
  div.innerHTML =
    '<div class="form-group">'
    + '<label>Product</label>'
    + '<select data-field="product">' + buildProductOptions() + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>Qty</label>'
    + '<input type="number" data-field="qty" min="1" placeholder="1" />'
    + '</div>'
    + '<button type="button" class="btn btn-danger btn-sm" style="margin-top:1.3rem" onclick="this.closest(\'.item-row\').remove()">✕</button>';
  container.appendChild(div);
}

function populateOrderItemProductSelects(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('select[data-field="product"]').forEach(function(sel) {
    var cur = sel.value;
    sel.innerHTML = buildProductOptions(cur);
  });
}

function getOrderItems(containerId) {
  var items = [];
  var container = document.getElementById(containerId);
  if (!container) return items;
  container.querySelectorAll('.item-row').forEach(function(row) {
    var productId = row.querySelector('select[data-field="product"]').value;
    var qtyVal    = row.querySelector('input[data-field="qty"]').value;
    var qty       = parseInt(qtyVal, 10);
    if (productId && qty > 0) items.push({ productId: productId, quantity: qty });
  });
  return items;
}

function initOrders() {
  // Seed first item row for create form
  addOrderItemRow('order-items');

  document.getElementById('add-order-item-btn').addEventListener('click', function() {
    addOrderItemRow('order-items');
  });

  document.getElementById('add-modify-item-btn').addEventListener('click', function() {
    addOrderItemRow('modify-order-items');
  });

  document.getElementById('create-order-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var dealerId = document.getElementById('order-dealer-select').value;
    if (!dealerId) { toast('Select a dealer', 'error'); return; }
    var items = getOrderItems('order-items');
    if (!items.length) { toast('Add at least one item', 'error'); return; }
    createOrder(dealerId, items);
    // Reset items
    document.getElementById('order-items').innerHTML = '';
    addOrderItemRow('order-items');
    renderOrders();
    renderStock();
  });

  document.getElementById('modify-order-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var orderId = document.getElementById('modify-order-id').value.trim().toUpperCase();
    if (!orderId) { toast('Enter an Order ID', 'error'); return; }
    var items = getOrderItems('modify-order-items');
    if (!items.length) { toast('Add at least one item', 'error'); return; }
    modifyOrder(orderId, items);
    renderOrders();
    renderStock();
  });

  document.getElementById('cancel-order-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var orderId = document.getElementById('cancel-order-id').value.trim().toUpperCase();
    if (!orderId) { toast('Enter an Order ID', 'error'); return; }
    cancelOrder(orderId);
    renderOrders();
    renderStock();
  });

  populateDealerSelects();
  renderOrders();
}

// ─── SUPPLIERS ───────────────────────────────────────────────────────────────

function addSupplier(data) {
  var suppliers = DB.read('suppliers');
  var id = DB.generateId('S', suppliers);
  suppliers.push({ id: id, name: data.name, contact: data.contact, email: data.email, products: data.products });
  DB.write('suppliers', suppliers);
  return id;
}

function renderSuppliers() {
  var suppliers = DB.read('suppliers');
  var tbody = document.querySelector('#suppliers-table tbody');
  if (!tbody) return;
  if (!suppliers.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No suppliers yet. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = suppliers.map(function(s) {
    return '<tr>'
      + '<td>' + esc(s.id) + '</td>'
      + '<td>' + esc(s.name) + '</td>'
      + '<td>' + esc(s.contact) + '</td>'
      + '<td>' + esc(s.email) + '</td>'
      + '<td>' + esc((s.products || []).join(', ')) + '</td>'
      + '</tr>';
  }).join('');
}

function initSuppliers() {
  document.getElementById('add-supplier-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var f        = e.target;
    var name     = f.querySelector('[name=name]').value.trim();
    var contact  = f.querySelector('[name=contact]').value.trim();
    var email    = f.querySelector('[name=email]').value.trim();
    var rawProds = f.querySelector('[name=products]').value.trim();
    var products = rawProds.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (!name) { toast('Supplier name is required', 'error'); return; }
    var id = addSupplier({ name: name, contact: contact, email: email, products: products });
    toast('✅ Supplier added: ' + id);
    f.reset();
    renderSuppliers();
    populateQuotationSelects();
  });
  renderSuppliers();
}

// ─── QUOTATIONS ───────────────────────────────────────────────────────────────

function requestQuotation(data) {
  var quotations = DB.read('quotations');
  var id = DB.generateId('Q', quotations);
  quotations.push({
    id:           id,
    supplierId:   data.supplierId,
    productId:    data.productId,
    quantity:     parseInt(data.quantity, 10),
    pricePerUnit: parseFloat(data.pricePerUnit),
    validUntil:   data.validUntil || null,
    status:       'received',
    orderId:      data.orderId || null
  });
  DB.write('quotations', quotations);
  return id;
}

function selectBestQuotation(productId, orderId) {
  var all = DB.read('quotations');
  var candidates = all.filter(function(q) {
    return q.productId === productId
      && q.status === 'received'
      && (orderId ? q.orderId === orderId : true);
  });
  if (!candidates.length) { toast('No open quotations for ' + productId, 'warning'); return null; }
  candidates.sort(function(a, b) { return a.pricePerUnit - b.pricePerUnit; });
  var best = candidates[0];
  all.forEach(function(q) {
    if (q.productId === productId && q.status === 'received'
        && (orderId ? q.orderId === orderId : true)) {
      q.status = q.id === best.id ? 'selected' : 'rejected';
    }
  });
  DB.write('quotations', all);
  updateStock(best.productId, best.quantity);
  toast('✅ Best quotation ' + best.id + ' selected — stock +' + best.quantity + ' of ' + best.productId);
  return best;
}

function selectQuotationById(quotationId) {
  var all = DB.read('quotations');
  var q   = all.find(function(x) { return x.id === quotationId; });
  if (!q) { toast('Quotation ' + quotationId + ' not found', 'error'); return null; }
  if (q.status !== 'received') { toast('Quotation already ' + q.status, 'error'); return null; }
  all.forEach(function(x) {
    if (x.productId === q.productId && x.status === 'received'
        && (q.orderId ? x.orderId === q.orderId : true)) {
      x.status = x.id === quotationId ? 'selected' : 'rejected';
    }
  });
  DB.write('quotations', all);
  updateStock(q.productId, q.quantity);
  toast('✅ Quotation ' + quotationId + ' selected — stock +' + q.quantity + ' of ' + q.productId);
  return q;
}

function renderQuotations(filterProductId, filterOrderId) {
  var quotations = DB.read('quotations');
  if (filterProductId) quotations = quotations.filter(function(q) { return q.productId === filterProductId; });
  if (filterOrderId)   quotations = quotations.filter(function(q) { return q.orderId   === filterOrderId; });
  var tbody = document.querySelector('#quotations-table tbody');
  if (!tbody) return;
  if (!quotations.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No quotations found.</td></tr>';
    return;
  }
  tbody.innerHTML = quotations.map(function(q) {
    return '<tr>'
      + '<td>' + esc(q.id) + '</td>'
      + '<td>' + esc(q.supplierId) + '</td>'
      + '<td>' + esc(q.productId) + '</td>'
      + '<td>' + q.quantity + '</td>'
      + '<td>₹' + Number(q.pricePerUnit).toFixed(2) + '</td>'
      + '<td>' + esc(q.validUntil || '—') + '</td>'
      + '<td><span class="badge badge-' + esc(q.status) + '">' + esc(q.status) + '</span></td>'
      + '<td>' + esc(q.orderId || '—') + '</td>'
      + '</tr>';
  }).join('');
}

function populateQuotationSelects() {
  var suppliers = DB.read('suppliers');
  var products  = DB.read('products');

  var sOpts = suppliers.map(function(s) {
    return '<option value="' + esc(s.id) + '">' + esc(s.id) + ' – ' + esc(s.name) + '</option>';
  }).join('');
  var pOpts = products.map(function(p) {
    return '<option value="' + esc(p.id) + '">' + esc(p.id) + ' – ' + esc(p.name) + '</option>';
  }).join('');

  var suppSel = document.getElementById('quot-supplier-select');
  if (suppSel) suppSel.innerHTML = '<option value="">Select supplier…</option>' + sOpts;

  var prodSel = document.getElementById('quot-product-select');
  if (prodSel) prodSel.innerHTML = '<option value="">Select product…</option>' + pOpts;

  var bestSel = document.getElementById('best-quot-product-select');
  if (bestSel) bestSel.innerHTML = '<option value="">Select product…</option>' + pOpts;
}

function initQuotations() {
  document.getElementById('add-quotation-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var f            = e.target;
    var supplierId   = f.querySelector('[name=supplierId]').value;
    var productId    = f.querySelector('[name=productId]').value;
    var quantity     = f.querySelector('[name=quantity]').value;
    var pricePerUnit = f.querySelector('[name=pricePerUnit]').value;
    var validUntil   = f.querySelector('[name=validUntil]').value;
    var orderId      = f.querySelector('[name=orderId]').value.trim();
    if (!supplierId || !productId || !quantity || !pricePerUnit) {
      toast('Fill all required fields', 'error'); return;
    }
    var id = requestQuotation({
      supplierId: supplierId, productId: productId, quantity: quantity,
      pricePerUnit: pricePerUnit, validUntil: validUntil, orderId: orderId || null
    });
    toast('✅ Quotation ' + id + ' stored');
    f.reset();
    populateQuotationSelects();
    renderQuotations();
  });

  document.getElementById('quotations-filter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var f         = e.target;
    var productId = f.querySelector('[name=filterProduct]').value.trim();
    var orderId   = f.querySelector('[name=filterOrder]').value.trim();
    renderQuotations(productId || undefined, orderId || undefined);
  });

  document.getElementById('clear-filter-btn').addEventListener('click', function() {
    document.getElementById('quotations-filter-form').reset();
    renderQuotations();
  });

  document.getElementById('select-best-quot-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var productId = document.getElementById('best-quot-product-select').value;
    var orderId   = document.getElementById('best-quot-order-id').value.trim();
    if (!productId) { toast('Select a product', 'error'); return; }
    selectBestQuotation(productId, orderId || undefined);
    renderQuotations();
    renderStock();
  });

  document.getElementById('select-quot-by-id-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var quotId = document.getElementById('select-quot-id').value.trim().toUpperCase();
    if (!quotId) { toast('Enter a Quotation ID', 'error'); return; }
    selectQuotationById(quotId);
    renderQuotations();
    renderStock();
  });

  populateQuotationSelects();
  renderQuotations();
}

// ─── PRODUCTION ───────────────────────────────────────────────────────────────

function generateProductionPlan(orderId) {
  var orders = DB.read('orders');
  var order  = orders.find(function(o) { return o.id === orderId; });
  if (!order) { toast('Order ' + orderId + ' not found', 'error'); return ''; }
  if (order.status !== 'confirmed' && order.status !== 'pending_stock') {
    toast('Order ' + orderId + ' is not in a producible state (' + order.status + ')', 'error');
    return '';
  }
  var products = DB.read('products');
  var lines    = [];
  lines.push('Production Plan — Order ' + orderId);
  lines.push('Dealer  : ' + order.dealerId);
  lines.push('─'.repeat(45));
  order.items.forEach(function(item) {
    var s     = getStockForProduct(item.productId);
    var avail = s ? s.quantity : 0;
    var need  = Math.max(0, item.quantity - avail);
    var p     = products.find(function(x) { return x.id === item.productId; });
    var name  = p ? p.name : item.productId;
    lines.push('  ' + name + ' (' + item.productId + ')');
    lines.push('    Required: ' + item.quantity + '  |  In stock: ' + avail + '  |  To produce: ' + need);
  });
  updateOrderStatus(orderId, 'in_production');
  toast('✅ Order ' + orderId + ' moved to in_production');
  renderOrders();
  return lines.join('\n');
}

function populateProductionProductSelect() {
  var products = DB.read('products');
  var opts = products.map(function(p) {
    return '<option value="' + esc(p.id) + '">' + esc(p.id) + ' – ' + esc(p.name) + '</option>';
  }).join('');
  var sel = document.getElementById('produced-product-select');
  if (sel) sel.innerHTML = '<option value="">Select product…</option>' + opts;
}

function initProduction() {
  document.getElementById('gen-plan-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var orderId = document.getElementById('gen-plan-order-id').value.trim().toUpperCase();
    if (!orderId) { toast('Enter an Order ID', 'error'); return; }
    var output = generateProductionPlan(orderId);
    if (output) document.getElementById('production-output').textContent = output;
  });

  document.getElementById('update-prod-status-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var orderId = document.getElementById('prod-status-order-id').value.trim().toUpperCase();
    var status  = document.getElementById('prod-status-select').value;
    if (!orderId) { toast('Enter an Order ID', 'error'); return; }
    var orders  = DB.read('orders');
    var order   = orders.find(function(o) { return o.id === orderId; });
    if (!order) { toast('Order ' + orderId + ' not found', 'error'); return; }
    updateOrderStatus(orderId, status);
    toast('✅ Production status → ' + status);
    renderOrders();
  });

  document.getElementById('add-produced-stock-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var productId = document.getElementById('produced-product-select').value;
    var qty       = parseInt(document.getElementById('produced-qty').value, 10);
    if (!productId) { toast('Select a product', 'error'); return; }
    if (isNaN(qty) || qty <= 0) { toast('Enter a valid quantity', 'error'); return; }
    updateStock(productId, qty);
    toast('✅ +' + qty + ' units of ' + productId + ' added to stock');
    renderStock();
    renderOrders();
  });

  populateProductionProductSelect();
  renderOrders();
}

// ─── BILLING ──────────────────────────────────────────────────────────────────

function generateInvoice(orderId) {
  var orders = DB.read('orders');
  var order  = orders.find(function(o) { return o.id === orderId; });
  if (!order)                     { toast('Order ' + orderId + ' not found', 'error');          return null; }
  if (order.status === 'cancelled') { toast('Cannot invoice a cancelled order', 'error');        return null; }
  if (order.invoice)              { return order.invoice; }

  var dealers  = DB.read('dealers');
  var products = DB.read('products');
  var dealer   = dealers.find(function(d) { return d.id === order.dealerId; });

  var lineItems = order.items.map(function(item) {
    var p     = products.find(function(x) { return x.id === item.productId; });
    var price = p ? p.price : 0;
    return {
      productId:    item.productId,
      productName:  p ? p.name : item.productId,
      quantity:     item.quantity,
      pricePerUnit: price,
      total:        price * item.quantity
    };
  });

  var subtotal   = lineItems.reduce(function(sum, li) { return sum + li.total; }, 0);
  var tax        = parseFloat((subtotal * 0.18).toFixed(2));
  var grandTotal = parseFloat((subtotal + tax).toFixed(2));

  var invoice = {
    invoiceId:   'INV' + String(Date.now()).slice(-6),
    orderId:     orderId,
    dealerId:    order.dealerId,
    dealerName:  dealer ? dealer.name : order.dealerId,
    lineItems:   lineItems,
    subtotal:    subtotal,
    tax:         tax,
    grandTotal:  grandTotal,
    generatedAt: new Date().toISOString()
  };

  // Save and mark order completed
  order.invoice   = invoice;
  order.status    = 'completed';
  order.updatedAt = new Date().toISOString();
  DB.write('orders', orders);
  return invoice;
}

function renderInvoice(invoice) {
  var rows = invoice.lineItems.map(function(li) {
    return '<tr>'
      + '<td>' + esc(li.productName) + '</td>'
      + '<td style="text-align:right">' + li.quantity + '</td>'
      + '<td style="text-align:right">₹' + Number(li.pricePerUnit).toFixed(2) + '</td>'
      + '<td style="text-align:right">₹' + Number(li.total).toFixed(2) + '</td>'
      + '</tr>';
  }).join('');

  document.getElementById('invoice-display').innerHTML =
    '<div class="card"><div class="invoice-box">'
    + '<div class="invoice-header">'
    + '  <div>'
    + '    <div class="invoice-title">INVOICE</div>'
    + '    <div class="invoice-subtitle">' + esc(invoice.invoiceId) + '</div>'
    + '  </div>'
    + '  <div class="invoice-meta">'
    + '    <div>Order: <strong>' + esc(invoice.orderId) + '</strong></div>'
    + '    <div>Date: ' + new Date(invoice.generatedAt).toLocaleDateString() + '</div>'
    + '  </div>'
    + '</div>'
    + '<div class="invoice-dealer"><strong>Bill To:</strong> ' + esc(invoice.dealerName) + ' (' + esc(invoice.dealerId) + ')</div>'
    + '<div class="table-wrap"><table>'
    + '  <thead><tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>'
    + '  <tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '<div class="invoice-totals">'
    + '  <p>Subtotal: ₹' + Number(invoice.subtotal).toFixed(2) + '</p>'
    + '  <p>GST (18%): ₹' + Number(invoice.tax).toFixed(2) + '</p>'
    + '  <p class="invoice-grand">Grand Total: ₹' + Number(invoice.grandTotal).toFixed(2) + '</p>'
    + '</div>'
    + '</div></div>';
}

function initBilling() {
  document.getElementById('billing-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var orderId = document.getElementById('billing-order-id').value.trim().toUpperCase();
    if (!orderId) { toast('Enter an Order ID', 'error'); return; }
    var invoice = generateInvoice(orderId);
    if (invoice) {
      if (invoice.generatedAt) {
        toast('✅ Invoice ' + invoice.invoiceId + ' generated');
      } else {
        toast('ℹ️ Invoice already exists: ' + invoice.invoiceId, 'info');
      }
      renderInvoice(invoice);
      renderOrders();
    }
  });
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────

function renderReports() {
  var orders   = DB.read('orders');
  var products = DB.read('products');
  var stock    = DB.read('stock');
  var dealers  = DB.read('dealers');

  // Total Sales
  var completed   = orders.filter(function(o) { return o.status === 'completed' && o.invoice; });
  var totalRevenue = completed.reduce(function(sum, o) { return sum + (o.invoice.grandTotal || 0); }, 0);
  var salesEl = document.getElementById('reports-sales');
  if (salesEl) {
    if (!completed.length) {
      salesEl.innerHTML = '<p style="color:var(--text-muted)">No completed orders with invoices yet.</p>';
    } else {
      var rows = completed.map(function(o) {
        var d = dealers.find(function(x) { return x.id === o.dealerId; });
        return '<tr>'
          + '<td>' + esc(o.id) + '</td>'
          + '<td>' + esc(d ? d.name : o.dealerId) + '</td>'
          + '<td>' + esc(o.invoice.invoiceId) + '</td>'
          + '<td style="text-align:right">₹' + Number(o.invoice.grandTotal).toFixed(2) + '</td>'
          + '</tr>';
      }).join('');
      salesEl.innerHTML =
        '<div class="table-wrap"><table>'
        + '<thead><tr><th>Order</th><th>Dealer</th><th>Invoice</th><th style="text-align:right">Amount</th></tr></thead>'
        + '<tbody>' + rows
        + '<tr style="font-weight:700;border-top:2px solid var(--border)">'
        + '<td colspan="3">Total Revenue (incl. GST)</td>'
        + '<td style="text-align:right">₹' + totalRevenue.toFixed(2) + '</td>'
        + '</tr>'
        + '</tbody></table></div>';
    }
  }

  // Stock Status
  var stockEl = document.getElementById('reports-stock');
  if (stockEl) {
    if (!stock.length) {
      stockEl.innerHTML = '<p style="color:var(--text-muted)">No stock data.</p>';
    } else {
      var sRows = stock.map(function(s) {
        var p   = products.find(function(x) { return x.id === s.productId; });
        var nm  = p ? p.name : s.productId;
        var low = s.quantity < 20;
        return '<tr>'
          + '<td>' + esc(nm) + '</td>'
          + '<td>' + esc(s.productId) + '</td>'
          + '<td>' + s.quantity + '</td>'
          + '<td><span class="badge badge-' + (low ? 'low' : 'ok') + '">' + (low ? '⚠ LOW' : 'OK') + '</span></td>'
          + '</tr>';
      }).join('');
      stockEl.innerHTML =
        '<div class="table-wrap"><table>'
        + '<thead><tr><th>Product</th><th>ID</th><th>Quantity</th><th>Status</th></tr></thead>'
        + '<tbody>' + sRows + '</tbody></table></div>';
    }
  }

  // Pending Orders
  var pendingEl = document.getElementById('reports-pending');
  if (pendingEl) {
    var active = orders.filter(function(o) { return o.status !== 'completed' && o.status !== 'cancelled'; });
    if (!active.length) {
      pendingEl.innerHTML = '<p style="color:var(--text-muted)">No pending orders.</p>';
    } else {
      var pRows = active.map(function(o) {
        var d     = dealers.find(function(x) { return x.id === o.dealerId; });
        var items = o.items.map(function(i) { return esc(i.productId) + '×' + i.quantity; }).join(', ');
        return '<tr>'
          + '<td>' + esc(o.id) + '</td>'
          + '<td>' + esc(d ? d.name : o.dealerId) + '</td>'
          + '<td>' + items + '</td>'
          + '<td><span class="badge badge-' + esc(o.status) + '">' + esc(o.status) + '</span></td>'
          + '</tr>';
      }).join('');
      pendingEl.innerHTML =
        '<div class="table-wrap"><table>'
        + '<thead><tr><th>Order</th><th>Dealer</th><th>Items</th><th>Status</th></tr></thead>'
        + '<tbody>' + pRows + '</tbody></table></div>';
    }
  }
}

// ─── Cross-module helpers ─────────────────────────────────────────────────────

function populateAllProductSelects() {
  populateStockProductSelect();
  populateOrderItemProductSelects('order-items');
  populateOrderItemProductSelects('modify-order-items');
  populateQuotationSelects();
  populateProductionProductSelect();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  initTabs();
  initDealers();
  initProducts();
  initStock();
  initOrders();
  initSuppliers();
  initQuotations();
  initProduction();
  initBilling();
  renderReports();

  document.getElementById('refresh-reports-btn').addEventListener('click', renderReports);
});
