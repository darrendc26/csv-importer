# GrowEasy CRM CSV Importer

An AI-powered CRM Lead CSV Importer featuring automated column mapping, intelligent data validation, cleaning, and company enrichment using Google Gemini AI.

---

## Key Features

*   **AI Header Mapping**: Drag and drop any CSV file. The backend leverages Gemini AI to dynamically analyze your CSV headers, compare them against the CRM lead schema, and suggest optimal column mappings with confidence scores.
*   **AI Data Cleaning & Normalization**: Automatically formats names (Title Case), standardizes phone numbers, validates emails, and parses messy currency/numeric estimated values.
*   **Company Enrichment**: If a company name is missing from a lead, Gemini AI looks up the email domain (excluding public providers like Gmail/Yahoo) to infer and enrich the company field.
*   **Beautiful Responsive Tables**: Features a mapping preview screen and a post-import dashboard containing data tables that support:
    *   Horizontal & vertical scrolling
    *   Sticky column headers for continuous scroll context
    *   Full responsive design (collapsing into a single-column layout on smaller screens)
*   **Export Options**: Download successfully processed leads as CSV or JSON, and retrieve skipped leads (with clear validation error descriptions) to fix and re-import.

---

## Project Structure

```
├── backend/                  # Node.js + TypeScript Express server
│   ├── src/                  # Source files (parsers, Gemini service, controller)
│   ├── Dockerfile            # Multi-stage production backend Docker build
│   └── .env.example          # Sample environment configurations
├── frontend/                 # Next.js React client application
│   ├── src/                  # Components (CSVUpload, PreviewTable, ResultTable)
│   └── Dockerfile            # Multi-stage production frontend Docker build
├── docker-compose.yml        # Orchestration configurations for local services
├── sample_leads.csv          # Sample CSV containing various lead records
└── README.md                 # Project documentation
```

---

## Tech Stack

*   **Frontend**: Next.js 14, React, Lucide Icons, Vanilla CSS
*   **Backend**: Node.js, Express, TypeScript, Multer (for CSV uploads), Google Generative AI SDK
*   **Orchestration**: Docker & Docker Compose

---

## Getting Started

### Prerequisites
Make sure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

---

### Step 1: Set Up Gemini API Credentials
The application requires a Google Gemini API Key for its mapping and cleaning engine.
1. Create a `.env` file in the `backend/` directory:
   ```bash
   touch backend/.env
   ```
2. Open `backend/.env` and add your Gemini API configuration:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_google_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

---

### Step 2: Spin Up Using Docker Compose
Run the following command at the root of the project to build and start both the frontend and backend services:

```bash
docker compose up --build
```

*   **Frontend Access**: Open `http://localhost:3001` in your browser.
*   **Backend API Access**: The server runs on `http://localhost:3000`.

*Note: The `docker-compose.yml` mounts the environment credentials dynamically from `backend/.env` at runtime using the `env_file` block, following production security guidelines.*

---

### Step 3: Run Manually (Without Docker)

If you prefer to run the services locally without Docker:

#### 1. Start the Backend:
```bash
cd backend
npm install
npm run dev
```

#### 2. Start the Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3001` in your browser.

---

## Testing with Sample Leads
We have provided two sample files in the root folder to help you test the importer:

1. **[groweasy_sample_leads.csv](groweasy_sample_leads.csv) (Official CRM Schema)**:
   Contains the exact 15 standard CRM columns and the 4 sample records from the assignment. All headers map 1:1 instantly with 100% confidence.

2. **[sample_leads.csv](sample_leads.csv) (Messy/Arbitrary Schema)**:
   Contains 10 records with different layouts (e.g. `Full Name`, `E-mail Address`, `EstValue`, `Comments`) to test the AI's ability to map, clean, and enrich records (e.g., extracting values, inferring company names from email domains, and appending unmapped columns to `crm_note`).

### Enforced Rules
*   **Allowed CRM Statuses:** Only `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, and `SALE_DONE`.
*   **Allowed Data Sources:** `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` (or left blank).
*   **Skip Criteria:** Any record with neither a valid email nor a valid mobile number is automatically skipped.
*   **Multi-value Processing:** The first email/mobile goes to its field; any subsequent values are appended to `crm_note`.
*   **Date Format:** `created_at` is cleaned and validated to a JS-parseable string format (`YYYY-MM-DD HH:MM:SS`). If missing/unmapped, it is programmatically stamped with the current import time.
