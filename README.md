# Handa Uncle — Receipt Parser

A receipt photo → structured financial data pipeline. Upload a receipt photo, extract data using Claude's vision API, correct any errors inline, and save. Built as the data ingestion layer for Handa Uncle, an AI-powered personal financial advisor.

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all
npm install

# 2. Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env and add your Anthropic API key

# 3. Start both frontend and backend
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

## Tech Stack

| Layer    | Choice                              |
| -------- | ----------------------------------- |
| Backend  | Node.js + Express + TypeScript      |
| Frontend | React + Vite + TypeScript           |
| Database | SQLite via `better-sqlite3`         |
| LLM      | Claude claude-sonnet-4-20250514 (vision) via Anthropic API |

## Project Structure

```
receipt-parser/
  backend/
    src/
      index.ts              ← Express server entry point
      routes/receipts.ts     ← all /api/receipts routes
      db/schema.ts           ← SQLite table setup
      db/queries.ts          ← typed query functions
      lib/claude.ts          ← Anthropic API call
      lib/parser.ts          ← JSON parse + validation
    .env.example
  frontend/
    src/
      App.tsx
      pages/Upload.tsx       ← upload screen
      pages/Correct.tsx      ← correction screen with confidence highlighting
      pages/List.tsx         ← saved receipts list
      components/ReceiptField.tsx ← editable field with confidence color
```

## API Endpoints

| Method | Path                  | Description                          |
| ------ | --------------------- | ------------------------------------ |
| POST   | `/api/receipts/parse` | Upload image, extract via Claude     |
| POST   | `/api/receipts`       | Save receipt (AI + corrected data)   |
| GET    | `/api/receipts`       | List all saved receipts              |
| GET    | `/api/receipts/:id`   | Get single receipt (corrected data)  |
| PATCH  | `/api/receipts/:id`   | Update corrected data                |

## How It Works

1. User uploads a receipt photo (JPG/PNG)
2. Backend sends the image to Claude claude-sonnet-4-20250514 with a structured extraction prompt
3. Claude returns merchant, date, line items, tax, total, and confidence scores
4. User reviews extracted data on the correction screen
   - **High confidence** fields: no highlight
   - **Medium confidence** fields: yellow border + ⚠️
   - **Low confidence** fields: red border + ⚠️
5. User corrects any errors inline and saves
6. Both the original AI extraction and corrected version are stored in SQLite

## README Questions

**Q1: What did you build?**
A receipt photo parser that extracts merchant, date, line items, and total using Claude's vision API, lets the user correct any errors inline, and persists both the AI's original extraction and the corrected version to SQLite. Built as the data ingestion layer for Handa Uncle, a personal financial advisory product.

**Q2: Biggest tradeoffs?**
1. Storing both AI and corrected versions adds schema complexity but is worth it — that delta is how you improve the model over time without any additional labeling effort.
2. Chose explicit save over auto-save — in a financial context, users should feel in control of what gets recorded.

**Q3: Where did you use an LLM?**
Claude claude-sonnet-4-20250514 (vision) for receipt parsing. Claude for prompt iteration.

**Q4: What would you do with another week?**
Income vs expense categorization with user context, expense graphs, multi-receipt dashboard, and mobile-optimized upload.

**Q5: Push back on the PM?**
"Save the corrected version" implies correction is a one-time pre-save step. In practice users will want to edit saved receipts. More importantly — should we store the original AI extraction alongside the correction? In a financial product, that delta is the most valuable data we generate: it tells us where our extraction is failing and gives us labeled data to improve the model. Feels like a one-line schema decision now vs a painful migration later.

## Environment Variables

| Variable             | Required | Description              |
| -------------------- | -------- | ------------------------ |
| `ANTHROPIC_API_KEY`  | Yes      | Your Anthropic API key   |
| `PORT`               | No       | Backend port (default: 3001) |
