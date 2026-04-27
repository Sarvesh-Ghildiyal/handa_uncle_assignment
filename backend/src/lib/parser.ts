import { ReceiptData } from "../db/queries";

interface LLMErrorResponse {
  error: string;
}

type ParseResult =
  | { success: true; data: ReceiptData }
  | { success: false; error: string };

/**
 * Parse and validate the raw JSON string returned by the LLM.
 * Returns a discriminated union so the caller can handle both cases cleanly.
 */
export function parseReceiptResponse(rawText: string): ParseResult {
  let parsed: unknown;

  // Strip markdown code fences if the LLM wrapped its output
  // e.g. ```json\n{...}\n``` → {...}
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  if (cleaned !== rawText.trim()) {
    console.log("[Parser] Stripped markdown fences from LLM response");
  }
  console.log("[Parser] Attempting JSON.parse on:", cleaned, "\n");

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Parser] JSON.parse failed on:\n", cleaned);
    return {
      success: false,
      error: "Could not parse receipt. Please try with a clearer photo.",
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      success: false,
      error: "Could not parse receipt. Please try with a clearer photo.",
    };
  }

  // Handle explicit error responses from the LLM
  if ("error" in parsed) {
    return {
      success: false,
      error: (parsed as LLMErrorResponse).error,
    };
  }

  const data = parsed as Record<string, unknown>;

  // Validate required fields
  if (typeof data.merchant !== "string") {
    return { success: false, error: "Missing or invalid merchant field." };
  }

  if (!Array.isArray(data.line_items)) {
    return { success: false, error: "Missing or invalid line_items field." };
  }

  if (data.confidence === null || typeof data.confidence !== "object") {
    return { success: false, error: "Missing or invalid confidence field." };
  }

  // Validate line items
  for (const item of data.line_items) {
    if (typeof item !== "object" || item === null) {
      return { success: false, error: "Invalid line item structure." };
    }
    if (typeof item.name !== "string" || typeof item.amount !== "number") {
      return {
        success: false,
        error: "Each line item must have a string name and numeric amount.",
      };
    }
  }

  // Validate confidence levels
  const validConfidence = ["high", "medium", "low"];
  const conf = data.confidence as Record<string, unknown>;
  for (const field of ["merchant", "date", "line_items", "total"]) {
    if (typeof conf[field] !== "string" || !validConfidence.includes(conf[field] as string)) {
      return {
        success: false,
        error: `Invalid confidence value for ${field}.`,
      };
    }
  }

  return {
    success: true,
    data: parsed as ReceiptData,
  };
}
