# Smart Campus Energy Optimizer ⚡

> **BUP CSE Fest Hackathon 2026** — LLM-Assisted Operator Directive Interpretation & 24-Hour Mathematical Energy Scheduling API.

The **Smart Campus Energy Optimizer** is a production-grade full-stack platform combining generative AI (Google Gemini) with constrained linear programming (`javascript-lp-solver`). It extracts physical constraints from unstructured natural language operator notes, calculates the cost-optimal 24-hour campus energy schedule, and provides both a verified REST API and an interactive developer testing suite.

---

## 🌟 Key Features

1. **Natural Language Directive Interpretation (LLM)**:
   - Uses Gemini Flash (`@google/genai`) to semantically parse operator directives (e.g. *"Solar output will drop to about 20% from 1 PM to 3 PM"* or *"Do not charge battery between 2 PM and 4 PM"*).
   - Multi-tier resilience: Includes deterministic heuristic fallback parsing if API keys are not provided or if requests experience upstream timeouts.
   - Accurately filters out non-operational operator chatter as `no_op`.

2. **24-Hour Mathematical Linear Programming (LP)**:
   - Formulates and solves an exact hourly linear optimization problem to minimize total grid import cost in BDT.
   - Enforces physical battery constraints (Capacity, Initial SOC, Minimum SOC, Charge/Discharge limits).
   - Guarantees **Battery Neutrality** ($SOC_{24} = SOC_0$) so storage remains balanced day-to-day.
   - Strict conservation of energy: $\text{Grid} + \text{Solar Used} + \text{Discharge} = \text{Demand} + \text{Charge}$.

3. **Production REST API**:
   - `GET /health` — Liveness and readiness probe for health checking.
   - `POST /optimize-energy` — Primary optimization endpoint matching hackathon specifications.
   - `GET /api/sample-scenario` — Canonical benchmark scenario (`GRID-101`).

4. **Interactive Dashboard & API Console**:
   - **Visual Dashboard**: 24-hour dispatch curves, battery state-of-charge tracking, interactive parameter tuning, and KPI overview.
   - **API Console**: In-browser API playground with real-time JSON validation, request sender, and auto-generated snippets for **cURL**, **JavaScript**, and **Python**.
   - **Dual View**: Side-by-side terminal console and visual dispatch analytics.

---

## 🏗️ Architecture

```
                                  +---------------------------+
                                  | Operator Notes / Scenario |
                                  +-------------+-------------+
                                                |
                                                v
                                  +-------------+-------------+
                                  |  Express API Server (3000) |
                                  +-------------+-------------+
                                                |
                       +------------------------+------------------------+
                       |                                                 |
                       v                                                 v
         +-------------+-------------+                     +-------------+-------------+
         | Gemini Directive Parser   |                     | Linear Programming Solver |
         | (Extracts Constraints)    |                     | (javascript-lp-solver)    |
         +-------------+-------------+                     +-------------+-------------+
                       |                                                 |
                       +------------------------+------------------------+
                                                |
                                                v
                                  +-------------+-------------+
                                  | 24h Hourly Plan & Summary |
                                  +-------------+-------------+
                                                |
                                                v
                                  +-------------+-------------+
                                  | React 19 + Recharts UI    |
                                  +---------------------------+
```

---

## 📡 API Reference

### 1. Health Check
```http
GET /health
```
**Response (200 OK):**
```json
{
  "status": "ok"
}
```

---

### 2. Optimize Energy Schedule
```http
POST /optimize-energy
Content-Type: application/json
```

#### Request Body Structure
```json
{
  "scenario_id": "GRID-101",
  "operator_notes": [
    "Solar output will drop to about 20% from 1 PM to 3 PM.",
    "Do not charge the battery between 2 PM and 4 PM.",
    "The cafeteria menu changes tomorrow."
  ],
  "hours": [
    { "hour": 0, "demand_kwh": 180, "solar_kwh": 0, "tariff_bdt_per_kwh": 7 },
    { "hour": 1, "demand_kwh": 170, "solar_kwh": 0, "tariff_bdt_per_kwh": 7 },
    ...
    { "hour": 23, "demand_kwh": 200, "solar_kwh": 0, "tariff_bdt_per_kwh": 7 }
  ],
  "battery": {
    "capacity_kwh": 500,
    "initial_energy_kwh": 200,
    "minimum_energy_kwh": 50,
    "max_charge_kwh_per_hour": 100,
    "max_discharge_kwh_per_hour": 100
  }
}
```

#### Response Body Structure (200 OK)
```json
{
  "scenario_id": "GRID-101",
  "status": "feasible",
  "total_cost_bdt": 24850.5,
  "directive_interpretation": [
    {
      "note_index": 0,
      "applies": true,
      "directive_type": "solar_reduction",
      "structured_adjustment": {
        "hours": [13, 14],
        "factor": 0.2
      },
      "explanation": "Solar output reduced to 20% between 1 PM and 3 PM."
    },
    {
      "note_index": 1,
      "applies": true,
      "directive_type": "no_charge_window",
      "structured_adjustment": {
        "hours": [14, 15]
      },
      "explanation": "Battery charging prohibited between 2 PM and 4 PM."
    },
    {
      "note_index": 2,
      "applies": false,
      "directive_type": "no_op",
      "structured_adjustment": null,
      "explanation": "Cafeteria menu change does not impact energy scheduling."
    }
  ],
  "hourly_plan": [
    {
      "hour": 0,
      "grid_import_kwh": 180,
      "solar_used_kwh": 0,
      "battery_charge_kwh": 0,
      "battery_discharge_kwh": 0,
      "battery_energy_kwh": 200,
      "cost_bdt": 1260
    }
  ],
  "summary": {
    "total_demand_kwh": 5860,
    "total_solar_available_kwh": 1800,
    "total_solar_used_kwh": 1710,
    "total_solar_curtailed_kwh": 90,
    "total_grid_import_kwh": 4150,
    "baseline_cost_bdt": 32400,
    "optimized_cost_bdt": 24850.5,
    "savings_bdt": 7549.5,
    "savings_percent": 23.3,
    "peak_grid_import_kwh": 290,
    "final_battery_energy_kwh": 200,
    "battery_neutrality_achieved": true
  }
}
```

#### HTTP Status Codes
| Status Code | Description |
| :--- | :--- |
| `200 OK` | Scenario successfully solved and optimal plan returned |
| `400 Bad Request` | Missing required fields, invalid hours array, or invalid ranges |
| `422 Unprocessable Entity` | Physically infeasible battery or grid parameters |
| `500 Internal Error` | Internal solver or service processing error |

---

## 🧠 Supported Operator Directives

| Directive Type | Description | Schema in `structured_adjustment` |
| :--- | :--- | :--- |
| `solar_reduction` | Reduces usable solar during specified hours by multiplier | `{"hours": [13, 14], "factor": 0.2}` |
| `minimum_battery_reserve` | Holds battery energy at or above threshold | `{"hours": [18, 19], "minimum_energy_kwh": 150}` |
| `no_charge_window` | Disables battery charging during specified hours | `{"hours": [14, 15]}` |
| `no_discharge_window` | Disables battery discharging during specified hours | `{"hours": [11, 12]}` |
| `max_grid_window` | Caps grid import to given maximum value | `{"hours": [17, 18, 19], "max_grid_kwh": 200}` |
| `no_op` | Irrelevant operator chatter; ignored by the scheduler | `null` (`applies: false`) |

*Note: Time ranges follow standard half-open convention $[T_{\text{start}}, T_{\text{end}})$. For example, "1 PM to 3 PM" spans hours `13` and `14`.*

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory (or configure them in your deployment platform):

```env
# Optional: Google Gemini API key for directive interpretation
# (Falls back to high-accuracy local regex parsing if omitted)
GEMINI_API_KEY="AIzaSy..."

# Optional: Public URL where the application is deployed
APP_URL="http://localhost:3000"

# Optional: Development/Production server port (defaults to 3000)
PORT=3000
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
git clone <repository-url>
cd smart-campus-energy-optimizer
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` serving both the Express backend API and the Vite React frontend.

---

## 📦 Production Build & Deployment

### Build Command
```bash
npm run build
```
This compiles:
1. The Vite client into static files in `dist/`.
2. The TypeScript backend (`server.ts`) into a bundled CommonJS file in `dist/server.cjs` with `esbuild`.

### Run Production Server
```bash
npm start
```
Starts `node dist/server.cjs` on port `3000` (or `process.env.PORT`).

### Deploying to Vercel / Cloud Run
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Start Command**: `npm start`
- **Node Version**: 18.x or 20.x

---

## 💻 Code Snippet Examples

### cURL
```bash
curl -X POST "http://localhost:3000/optimize-energy" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_id": "TEST-01",
    "operator_notes": ["Solar drops to 50% between 12 PM and 2 PM."],
    "hours": [...],
    "battery": {
      "capacity_kwh": 500,
      "initial_energy_kwh": 200,
      "minimum_energy_kwh": 50,
      "max_charge_kwh_per_hour": 100,
      "max_discharge_kwh_per_hour": 100
    }
  }'
```

### Python
```python
import requests

url = "http://localhost:3000/optimize-energy"
payload = {
    "scenario_id": "GRID-101",
    "operator_notes": ["Do not charge the battery between 2 PM and 4 PM."],
    "hours": [...],
    "battery": {
        "capacity_kwh": 500,
        "initial_energy_kwh": 200,
        "minimum_energy_kwh": 50,
        "max_charge_kwh_per_hour": 100,
        "max_discharge_kwh_per_hour": 100
    }
}

response = requests.post(url, json=payload)
data = response.json()
print("Optimized Cost (BDT):", data["total_cost_bdt"])
print("Savings (%):", data["summary"]["savings_percent"])
```

---

## 📜 License & Acknowledgements

Created for the **BUP CSE Fest Hackathon 2026**.
Developed with React 19, Tailwind CSS, Express, Google Gen AI SDK, and `javascript-lp-solver`.
