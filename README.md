# HisabKhata POS 🏪⚡

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Serverless-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-SQLite-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-Object_Storage-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **A modern, offline-first GST Billing, Inventory Management & Point-of-Sale web platform for small retail and wholesale businesses in India.**  
> Engineered for ultra-fast counter operations, zero infrastructure maintenance costs, and edge scalability.

🔗 **Live Demo**: [https://pos.hisabkhata.sumanonline.com](https://pos.hisabkhata.sumanonline.com)

---

## 📖 Overview

**HisabKhata POS** replaces slow, cumbersome desktop billing software with a nimble, progressive web application. Tailored specifically for Indian merchants (electronics, electrical, retail, pharmaceuticals, and grocery stores), it bridges the gap between rapid counter billing, accurate GST compliance, and real-time ledger accounting.

Built with local-first resilience, billing never stops during internet outages. Transactions are saved locally and seamlessly synchronize with the cloud database when connectivity is restored, ensuring uninterrupted business operations with automated backups.

---

## ✨ Features

- **⚡ Fast POS Counter Checkout**: Search products instantly by name, SKU, or barcode scanner. Supports item-level discounts, invoice discounts, custom tax rates, and one-click cash/UPI payments.
- **🇮🇳 100% Indian GST Compliant**: Automatic CGST, SGST, and IGST tax calculation, HSN/SAC classification, reverse-charge indicators, and exportable GSTR-1 & GSTR-3B tax summaries.
- **📍 Precise Storage Location Tracking**: Organize warehouse and store shelves by exact **Aisle**, **Rack**, and **Shelf / Bin** coordinates for rapid item retrieval during rush hours.
- **🖨️ Flexible Receipt Printing**: Print professional **A4 GST Tax Invoices** or standard **2-inch / 3-inch (58mm / 80mm) Thermal Receipts** via Bluetooth or USB ESC/POS printers.
- **👥 Customer & Vendor Khata (Credit Ledgers)**: Track debit/credit balances, set credit limits, view transaction histories, and record settlements with synchronized invoice updates.
- **📲 Instant WhatsApp Invoicing**: Send digital receipts, invoice links, and payment reminder notifications directly to customers' WhatsApp numbers.
- **📦 Inventory & Stock Control**: Real-time stock decrement upon billing, low-stock threshold alerts, batch pricing, purchase order entry, and bulk CSV item import/export.
- **📴 Offline-First Reliability**: Local caching guarantees that counter billing continues uninterrupted even without an active internet connection.
- **🌓 Modern Adaptive UI**: Fully responsive interface tailored for mobile phones, tablets, POS touch terminals, and desktop displays with Light/Dark themes.

---

## 🖼️ Interface Tour

### Desktop Experience

| Dashboard & Business KPIs | POS Billing Terminal |
| :---: | :---: |
| ![Dashboard](project_images/desh-view/Dashboard.png) | ![POS Terminal](project_images/desh-view/POS-page.png) |

| Inventory & Stock Locations | Sales Invoices & History |
| :---: | :---: |
| ![Inventory](project_images/desh-view/inventory.png) | ![Sales Invoices](project_images/desh-view/sales-page.png) |

### Mobile Experience

| Mobile Dashboard | Mobile POS Counter | Mobile Inventory |
| :---: | :---: | :---: |
| ![Mobile Dashboard](project_images/mobile-view/dashboard-page.png) | ![Mobile POS](project_images/mobile-view/POS-page.png) | ![Mobile Inventory](project_images/mobile-view/Inventory-page.png) |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS, Custom Glassmorphic Theme Tokens
- **Icons**: Lucide React
- **Routing**: React Router DOM v6
- **Hosting**: Edge Static Hosting

### Backend & Infrastructure
- **API Framework**: Hono.js v4 (Lightweight edge web framework)
- **Runtime**: Serverless Edge Isolates (V8)
- **Database**: Serverless SQLite (D1)
- **Storage**: S3-Compatible Object Storage (R2)

---

## 📂 Project Structure

```text
HisabKhata_POS/
├── backend/
│   ├── src/
│   │   └── index.js           # Hono API routes & serverless handler
│   ├── schema.sql             # Database schema migrations & seed data
│   ├── package.json           # Backend dependencies
│   └── wrangler.toml          # Serverless worker & database configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js      # Unified REST API client
│   │   ├── components/
│   │   │   ├── Auth.jsx       # Authentication & login flow
│   │   │   ├── Dashboard.jsx  # Revenue metrics, charts & business KPIs
│   │   │   ├── Inventory.jsx  # Stock catalog, location mapping & CSV tools
│   │   │   ├── LandingPage.jsx# Public showcase landing page
│   │   │   ├── Parties.jsx    # Customer & vendor Khata credit ledgers
│   │   │   ├── POSBilling.jsx # Fast touch billing counter & thermal print
│   │   │   ├── Sales.jsx      # Invoices history, payment records & PDF generation
│   │   │   └── Settings.jsx   # Store profile, GSTIN, thermal printer config
│   │   ├── utils/
│   │   │   └── theme.js       # Light / Dark mode theme controller
│   │   ├── App.jsx            # Application router & layout shell
│   │   └── main.jsx           # Vite entrypoint
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite bundler configuration
│
└── project_images/            # Application interface preview screenshots
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Wrangler CLI** (for serverless edge runtime):
  ```bash
  npm install -g wrangler
  ```

---

### Installation & Local Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/SumanCH8514/HisabKhata_POS.git
cd HisabKhata_POS
```

#### 2. Backend Setup (Edge API & Database)
```bash
cd backend
npm install

# Login to your deployment account
wrangler login

# Create the SQLite database
wrangler d1 create hisabkhata-pos-db

# Run schema migrations locally
wrangler d1 execute hisabkhata-pos-db --local --file=./schema.sql

# Start the local API server (runs on http://localhost:8787)
npm run dev
```

#### 3. Frontend Setup (React & Vite)
Open a second terminal window:
```bash
cd frontend
npm install

# Copy environment template
cp .env.example .env

# Start the development server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser to test the application.

---

## 💡 Usage Workflow

1. **Company & Store Onboarding**: Open **Settings** to set your Store Name, GSTIN, Contact Details, UPI ID for QR payments, and upload your logo.
2. **Catalog & Location Setup**: In **Inventory**, add products with Sale Price, Purchase Price, GST rate, HSN Code, and storage coordinates (**Aisle 2, Rack B, Shelf 4**).
3. **Quick Billing**: On the **POS Billing** screen, scan barcodes or tap items to build carts. Select Payment Mode (Cash, UPI, Khata), apply discounts, and print A4 or Thermal receipts.
4. **Khata & Credit Tracking**: Navigate to **Customers & Vendors** to record partial payments, review ledgers, or send WhatsApp receipts with payment links.
5. **Tax Reports**: Export CA-friendly GST summary sheets and sales ledgers from **Sales & Invoices**.

---

## ☁️ Deployment

### Deploy Backend
```bash
cd backend
npx wrangler deploy
```

### Deploy Frontend
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=hisabkhata-pos
```

---

## 🤝 Contributing

Contributions are welcome! If you would like to improve features or fix issues:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author & Contact

**Suman**  
- **GitHub**: [@SumanCH8514](https://github.com/SumanCH8514)  
- **Website**: [sumanonline.com](https://sumanonline.com)  
- **Project Repository**: [https://github.com/SumanCH8514/HisabKhata_POS](https://github.com/SumanCH8514/HisabKhata_POS)
