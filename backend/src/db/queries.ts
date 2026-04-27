import { getDb } from "./schema";

// ----- Types -----

export interface ReceiptLineItem {
  name: string;
  amount: number;
}

export interface ReceiptConfidence {
  merchant: "high" | "medium" | "low";
  date: "high" | "medium" | "low";
  line_items: "high" | "medium" | "low";
  total: "high" | "medium" | "low";
}

export interface ReceiptData {
  merchant: string;
  date: string | null;
  line_items: ReceiptLineItem[];
  tax: number | null;
  total: number | null;
  currency: string;
  confidence: ReceiptConfidence;
  extraction_notes?: string | null;
}

export interface ReceiptRow {
  id: string;
  created_at: string;
  updated_at: string;
  ai_extraction: string; // JSON string
  corrected_data: string; // JSON string
  image_path: string;
}

export interface ReceiptListItem {
  id: string;
  merchant: string;
  date: string | null;
  total: number | null;
  created_at: string;
}

// ----- Queries -----

export function insertReceipt(
  id: string,
  aiExtraction: ReceiptData,
  correctedData: ReceiptData,
  imagePath: string
): ReceiptRow {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO receipts (id, created_at, updated_at, ai_extraction, corrected_data, image_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    now,
    now,
    JSON.stringify(aiExtraction),
    JSON.stringify(correctedData),
    imagePath
  );

  return getReceiptById(id)!;
}

export function getReceiptById(id: string): ReceiptRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM receipts WHERE id = ?");
  return stmt.get(id) as ReceiptRow | undefined;
}

export function getAllReceipts(): ReceiptListItem[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, corrected_data, created_at FROM receipts ORDER BY created_at DESC"
  );
  const rows = stmt.all() as ReceiptRow[];

  return rows.map((row) => {
    const data: ReceiptData = JSON.parse(row.corrected_data);
    return {
      id: row.id,
      merchant: data.merchant,
      date: data.date,
      total: data.total,
      created_at: row.created_at,
    };
  });
}

export function updateCorrectedData(
  id: string,
  correctedData: ReceiptData
): ReceiptRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE receipts SET corrected_data = ?, updated_at = ? WHERE id = ?
  `);

  const result = stmt.run(JSON.stringify(correctedData), now, id);
  if (result.changes === 0) return undefined;

  return getReceiptById(id);
}
