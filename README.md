# Manufacturing & Dealer Management System (MDMS)

A simple, fully-functional **Manufacturing and Dealer Management System** built with **Node.js** and **JSON file storage** — no database, no external dependencies.

---

## Features

| Module | Capabilities |
|---|---|
| **Dealer Management** | Add dealers, view dealers |
| **Product & Stock** | Add products, view products, view stock, set stock quantity |
| **Dealer Orders** | Create order (with stock check), modify order, cancel order, view all orders |
| **Suppliers & Quotations** | Add suppliers, store quotations, view quotations, auto-select best (lowest-price) quotation |
| **Production** | Generate production plan per order, update production status, record produced stock |
| **Billing** | Generate itemised invoice with 18% GST for any order |
| **Reports** | Total sales revenue, stock status (with low-stock warnings), pending/active orders |

---

## Project Structure

```
Asgn_mdms/
├── index.js              # CLI entry point (main menu)
├── package.json
├── data/                 # JSON "database" files
│   ├── dealers.json
│   ├── products.json
│   ├── stock.json
│   ├── orders.json
│   ├── suppliers.json
│   └── quotations.json
└── src/                  # Modules (one per domain)
    ├── utils.js          # readJSON / writeJSON / generateId helpers
    ├── dealers.js
    ├── products.js
    ├── stock.js
    ├── orders.js
    ├── suppliers.js
    ├── quotations.js
    ├── production.js
    ├── billing.js
    └── reports.js
```

---

## Requirements

- **Node.js ≥ 14** (no `npm install` needed — zero external dependencies)

---

## How to Run

```bash
node index.js
# or
npm start
```

You will see the main menu:

```
╔══════════════════════════════════════════╗
║  Manufacturing & Dealer Management System ║
╚══════════════════════════════════════════╝

═══ Main Menu ═══
  1. Dealer Management
  2. Product & Stock Management
  3. Dealer Orders
  4. Suppliers & Quotations
  5. Production
  6. Billing
  7. Reports
  0. Exit
```

Navigate by entering the number for the desired menu item.

---

## System Flow (End-to-End Walkthrough)

### 1. Dealer places an order
- Go to **3 → 1 (Create Order)**
- Select a dealer ID and enter line items (product ID + quantity)
- The system checks stock automatically:
  - **Sufficient stock** → order status set to `confirmed`, stock deducted
  - **Insufficient stock** → order status set to `pending_stock`, shortages listed

### 2. If stock is insufficient → request supplier quotations
- Go to **4 → 3 (Store Quotation)**
- Enter supplier ID, product ID, quantity, price/unit, validity date, and the order ID
- Repeat for multiple suppliers

### 3. Choose the best quotation
- Go to **4 → 5 (Select Best Quotation)** — automatically picks lowest price
  - OR **4 → 6 (Select Quotation by ID)** — manually pick
- Selected quotation stock is added to inventory; others are marked rejected

### 4. Start production
- Go to **5 → 1 (Generate Production Plan for Order)**
- Reviews required vs. available quantities; moves order to `in_production`

### 5. Update production status
- Go to **5 → 2 (Update Production Status)**
- Set status to `completed` when production finishes

### 6. Generate invoice
- Go to **6 → 1 (Generate Invoice for Order)**
- Prints an itemised invoice with subtotal, 18% GST, and grand total
- Invoice is stored inside the order record in `orders.json`

### 7. View reports
- Go to **7 (Reports)**
- Shows: total revenue, stock levels (low-stock flagged ⚠️), and all active orders

---

## Sample Data

The `data/` directory ships with pre-populated sample records:

| File | Sample Records |
|---|---|
| `dealers.json` | Alpha Traders (D001), Beta Distributors (D002) |
| `products.json` | Steel Rod (P001), Copper Wire (P002), Plastic Casing (P003) |
| `stock.json` | 200 / 500 / 150 units respectively |
| `orders.json` | One completed order ORD001 with invoice |
| `suppliers.json` | MetalWorks Ltd (S001), ElectroParts Co (S002) |
| `quotations.json` | One accepted quotation Q001 |

---

## Data Schemas

### dealers.json
```json
{ "id": "D001", "name": "...", "contact": "...", "email": "...", "address": "..." }
```

### products.json
```json
{ "id": "P001", "name": "...", "description": "...", "price": 150, "unit": "piece" }
```

### stock.json
```json
{ "productId": "P001", "quantity": 200, "lastUpdated": "2026-04-01T10:00:00.000Z" }
```

### orders.json
```json
{
  "id": "ORD001", "dealerId": "D001",
  "items": [{ "productId": "P001", "quantity": 50 }],
  "status": "confirmed|pending_stock|in_production|completed|cancelled",
  "createdAt": "...", "updatedAt": "...", "invoice": null
}
```

### suppliers.json
```json
{ "id": "S001", "name": "...", "contact": "...", "email": "...", "products": ["P001"] }
```

### quotations.json
```json
{
  "id": "Q001", "supplierId": "S001", "productId": "P001",
  "quantity": 100, "pricePerUnit": 140,
  "validUntil": "2026-05-01T00:00:00.000Z",
  "status": "received|selected|rejected", "orderId": "ORD001"
}
```
