import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import receiptsRouter from "./routes/receipts";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Request Logger ─────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? 31 : status >= 400 ? 33 : status >= 200 ? 32 : 0;
    console.log(
      `\x1b[${color}m${req.method}\x1b[0m ${req.originalUrl} → ${status} (${ms}ms)`
    );
  });
  next();
});

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/receipts", receiptsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Backend running on http://localhost:${PORT}`);
  console.log(`📦  Model: claude-sonnet-4-5`);
  console.log(`🗄️   DB: SQLite (data/receipts.db)\n`);
});
