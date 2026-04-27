# Handa Uncle — Receipt Parser

A receipt photo → structured financial data pipeline. Upload a receipt photo or PDF, extract data using Claude's vision API, correct any errors inline, and save. Built as the data ingestion layer for Handa Uncle, an AI-powered personal financial advisor.

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

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

| Layer | Choice |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite + TypeScript |
| Database | SQLite via `better-sqlite3` |
| LLM | Claude claude-sonnet-4-5 (vision) via Anthropic API |

## Project Structure

```
receipt-parser/
  backend/
    src/
      index.ts                    ← Express server entry point
      routes/receipts.ts          ← all /api/receipts routes
      db/schema.ts                ← SQLite table setup
      db/queries.ts               ← typed query functions
      lib/claude.ts               ← Anthropic API call
      lib/parser.ts               ← JSON parse + validation
    .env.example
  frontend/
    src/
      App.tsx
      pages/Upload.tsx            ← upload screen
      pages/Correct.tsx           ← correction screen with confidence highlighting
      pages/List.tsx              ← saved receipts list
      components/ReceiptField.tsx ← editable field with confidence color
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/receipts/parse` | Upload image, extract via Claude |
| POST | `/api/receipts` | Save receipt (AI + corrected data) |
| GET | `/api/receipts` | List all saved receipts |
| GET | `/api/receipts/:id` | Get single receipt (corrected data) |
| PATCH | `/api/receipts/:id` | Update corrected data |

## How It Works

1. User uploads a receipt photo or PDF (JPG, PNG, PDF)
2. Backend sends the image to Claude claude-sonnet-4-5 with a structured extraction prompt
3. Claude returns merchant, date, line items, tax, total, and a confidence score per field
4. User reviews extracted data on the correction screen
   - **High confidence** fields: no highlight
   - **Medium confidence** fields: yellow border + ⚠️
   - **Low confidence** fields: red border + ⚠️
5. User corrects any errors inline and saves
6. Both the original AI extraction and the corrected version are stored in SQLite

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PORT` | No | Backend port (default: 3001) |

---

## The Five Questions

### Q1 — What did I build?

A UI that lets users upload their receipts (image or PDF) and extracts structured financial data from them using AI. The extracted output is shown in an editable format where users can correct fields inline. Low-confidence fields are highlighted so users know exactly where to focus their attention.

This is not a standalone product. It acts as a utility layer within the larger Handa Uncle system, where the extracted and corrected data feeds into the financial advisory engine that reasons about the user's goals, income, expenses, and risk behavior.

---

### Q2 — What are the biggest tradeoffs I made, and why?

The receipt parser is one cog in the larger financial advisory system being built at Handa Uncle. It sits as a utility layer on top of the core intelligence layer that generates financial advice.

The main tradeoff was between **speed from AI vs user involvement for accuracy and personalization.**

AI extracts fast. But to ensure the data feeding into the advisory engine is actually correct, I added an inline correction step with confidence-highlighted fields. This slightly slows the experience, but meaningfully improves data quality — and data quality here directly impacts the quality of the financial advice downstream.

The reason this tradeoff matters: financial advice is built on pillars like income, expenses, assets, liabilities, goals, and risk behavior. The receipt parser contributes primarily to expense tracking and structured financial inputs. This data will later be used to estimate the gap between a user's goals and their current trajectory, and to simulate how behavioral changes affect outcomes. Accuracy at the ingestion stage determines the reliability of everything above it.

---

### Q3 — Where did I use an LLM, and for what?

LLMs were used across the full workflow.

My approach was to read the problem statement multiple times, do some initial research, form a rough theory, and then use LLMs to brainstorm and refine the execution plan.

I used LLMs to generate a `project_spec.md` based on the refined plan, and then created prompts for agents to build the application. At that point, I had everything needed for spec-driven development.

I used Cursor to execute the build. Most of the application was generated in one shot based on the prompts. After that, I reviewed everything to ensure it matched the intended output and refined wherever required.

LLMs were also used to improve language and structure across the system — including the extraction prompt, the README, and the product decisions documented in the spec.

The judgment calls — what to build, what to cut, how to handle failures, and why to store the delta — were made before the LLM wrote a single line of code.

---

### Q4 — What would I do with another week?

**Langfuse — LLM tracing**

First, I would add tracing using Langfuse.

Right now, prompt tuning and model behavior are mostly intuition-driven. With Langfuse, every LLM call can be tracked — inputs, outputs, latency, and failures. This would give structured visibility into how the system is actually behaving in production.

More importantly, this would not just be for this feature. It would act as a **centralized tracing layer across the entire company**, where every AI-driven workflow — whether it is receipt parsing, financial advice generation, or future features — can be monitored and improved from a single place. This creates a feedback loop where model performance, prompt quality, and system behavior continuously improve based on real usage instead of assumptions.

---

**Multiple receipt uploads + categorization**

Second and third go together.

I would extend the system to support **multiple receipt uploads with proper segregation and aggregation**, and then build **categorization on top of that.**

Users should be able to upload multiple receipts at once, and the system should group and organize them correctly. On top of this, categorization would classify expenses into structured buckets — fixed vs variable, obligations vs lifestyle inflation vs dependent responsibilities.

Once this layer is in place, we can move beyond just storing data and start **reasoning over it.**

This is where the next step comes in: building an **estimated financial trajectory for the user.** Based on income, expenses, assets, liabilities, and categorized spending behavior, we can generate a graph showing the gap between the user's goals and their current trajectory over time. This can also simulate changes — like how reducing certain expenses or increasing income affects the outcome.

The flow becomes: raw receipts → structured data → categorized insights → projected financial trajectory.

---

**Long term — AI software factory**

The longer-term direction is to build a centralized custom dashboard for the entire company, turning it into an **AI software factory.**

Instead of disconnected tools for sales, support, billing, engineering, hiring, and operations, everything plugs into a single system with an intelligence layer at the center. Every process becomes observable and learnable. Every action generates data. Every workflow can be optimized over time.

The idea is to build **closed-loop systems** where the company continuously learns from its own operations.

The team structure around this stays lean: Individual Contributors across Engineering, Operations, Support, and Sales — everyone ships working prototypes, not presentations. A Directly Responsible Individual owns each outcome, focusing on strategy and customer results. The founder continues to build, guide, and lead by example — not delegate AI strategy away.

The leverage comes from AI, not headcount. The shift is toward maximizing output per person using intelligence systems instead of scaling teams traditionally.

---

### Q5 — What is one thing in this spec I would push back on?

Storing only the corrected version.

I call this the **Delta Factor.**

Instead of just saving the final corrected version, we should store both the original AI output and the corrected data. The difference between them is the delta — and that delta is the most valuable signal in the system.

It directly tells us where the model is failing, what kind of errors are happening, and under what conditions. This becomes a feedback loop for improving prompts, tuning models, and increasing accuracy over time.

In a financial system where every input affects the quality of advice, this is not just an implementation detail — it is a core design decision. I built it this way, but I would have wanted to align on this explicitly before writing the first line of code.

---

**A small addition, a curiosity:**

Post submission, while thinking about the implementation, this occurred to me.

Given Handa Uncle is an AI-native system targeting large-scale personalized financial advice, my natural inclination would have been Python (FastAPI), especially since most of the ML and AI ecosystem is built around it.

Earlier, two reasons that made sense for choosing a stack were team familiarity and consistency across the system. But since the frontend was open to any choice (React, Vue, or even vanilla), I was curious about the specific preference for TypeScript on the backend.

Would love to understand the reasoning behind that decision.
