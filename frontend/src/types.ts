export interface ReceiptLineItem {
  name: string;
  amount: number;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ReceiptConfidence {
  merchant: ConfidenceLevel;
  date: ConfidenceLevel;
  line_items: ConfidenceLevel;
  total: ConfidenceLevel;
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

export interface ReceiptListItem {
  id: string;
  merchant: string;
  date: string | null;
  total: number | null;
  created_at: string;
}

export interface ReceiptDetail {
  id: string;
  created_at: string;
  updated_at: string;
  corrected_data: ReceiptData;
  image_path: string;
}
