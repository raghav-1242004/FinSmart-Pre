# FinSmart Pro — Combined Major Project

> **2 Minor Projects → 1 Major Project**
> SmartLoan AI (ML Loan Prediction) + FinCalc Pro (25 Financial Calculators)

---

## Overview

**FinSmart Pro** is a full-stack financial intelligence platform that combines:

| Module | Description |
|--------|-------------|
| **SmartLoan AI** | ML-powered loan eligibility prediction using CatBoost, XGBoost, Random Forest |
| **FinCalc Pro** | 25 interactive financial calculators — EMI, SIP, FD, GST, Tax, Salary, Retirement, and more |

---

## Features

### SmartLoan AI (AI Module)
- 5 ML models (CatBoost, XGBoost, Random Forest, Decision Tree, Logistic Regression)
- 93%+ accuracy on real loan dataset (32,000+ records)
- Risk scoring with confidence % and recommendations
- PDF report export per prediction
- User authentication (register / login / admin roles)
- Prediction history with CSV export
- Admin panel with user management & analytics
- Dark/Light theme toggle

### FinCalc Pro (Calculator Module)
- **7 Loan Calculators**: EMI, Personal, Home, Car, Education, Gold, Business
- **7 Investment Calculators**: Simple Interest, Compound Interest, SIP, FD, RD, Savings, Retirement
- **5 Tax & Salary Calculators**: GST, Income Tax (FY 2025-26), Salary, PF, Gratuity
- **6 Planning Tools**: Currency Converter, Insurance Premium, Inflation, Budget Planner, Mortgage, Expense Tracker
- PDF report download for every calculator
- Category tabs + search filtering
- No login required — publicly accessible

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, Flask 3.0 |
| ML Models | CatBoost, XGBoost, scikit-learn, joblib |
| Database | SQLite (via Flask-SQLAlchemy) |
| Auth | Werkzeug bcrypt, Flask sessions |
| Frontend | HTML5, CSS3 (custom design system), Vanilla JS |
| PDF Export | jsPDF (calculators), ReportLab / FPDF2 (predictions) |
| Fonts | Poppins + Inter (Google Fonts) |
| Icons | Font Awesome 6 |
| Charts | Custom SVG bar charts |

---

## Installation

```bash
# 1. Clone / extract the project
cd finsmartpro

# 2. Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Open **http://localhost:5000** in your browser.

---

## Project Structure

```
finsmartpro/
├── app.py                  # Flask backend (all routes + ML logic)
├── requirements.txt
├── README.md
├── models/                 # Pre-trained ML artifacts (.pkl, .json)
├── data/                   # Loan dataset (CSV)
├── instance/               # SQLite database (auto-created)
├── templates/
│   ├── base.html           # Shared layout + navbar
│   ├── index.html          # Landing page (SmartLoan AI hero)
│   ├── calculators.html    # FinCalc Pro — 25 calculators  ← NEW
│   ├── predict.html        # AI loan prediction form
│   ├── dashboard.html      # Analytics dashboard
│   ├── history.html        # Prediction history
│   ├── login.html
│   ├── register.html
│   ├── admin.html
│   └── loan_contacts.html
└── static/
    ├── css/
    │   └── fincalc.css     # FinCalc Pro styles (integrated)
    ├── js/
    │   └── fincalc.js      # All 25 calculator functions + PDF engine
    └── img/
        └── heatmap.png     # ML correlation heatmap
```

---

## Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Landing page |
| `/calculators` | No | FinCalc Pro — 25 calculators |
| `/predict-page` | Yes | AI loan prediction |
| `/dashboard` | Yes | Analytics dashboard |
| `/history` | Yes | Prediction history |
| `/loan-contacts` | Yes | Loan provider contacts |
| `/admin` | Admin | Admin panel |
| `/api/predict` | Yes | POST — ML prediction API |
| `/api/history` | Yes | GET — user prediction history |
| `/api/model-metrics` | No | GET — ML model performance stats |
| `/api/export-csv` | Yes | GET — export history as CSV |

---

## Default Admin

Create any account, then manually set `role='admin'` in the SQLite DB:
```sql
UPDATE user SET role='admin' WHERE username='yourusername';
```

---

## Academic Note

Built as a combined MCA / B.Tech Major Project demonstrating:
- Full-stack web development (Flask)
- Machine learning pipeline (data preprocessing → training → deployment)
- UI/UX design (custom design system, dark/light themes)
- Financial domain knowledge (25 calculator formulas)
- Software integration (2 minor projects → 1 major project)
