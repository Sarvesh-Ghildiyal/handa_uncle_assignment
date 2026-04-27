import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

// System prompt from LLM_PROMPT.md — used verbatim
const SYSTEM_PROMPT = `You are a receipt data extraction engine. You will be given an image of a receipt, bill, or invoice. Your job is to extract structured financial data from it accurately.

Return ONLY a valid JSON object. No explanation, no markdown, no code fences. Just raw JSON.

The JSON must follow this exact structure:

{
  "merchant": string,
  "date": string (YYYY-MM-DD format, or null if not found),
  "line_items": [
    {
      "name": string,
      "amount": number
    }
  ],
  "tax": number or null,
  "total": number or null,
  "currency": string (use "INR" if rupee symbol ₹ is present, "USD" if $, otherwise your best guess based on context),
  "confidence": {
    "merchant": "high" | "medium" | "low",
    "date": "high" | "medium" | "low",
    "line_items": "high" | "medium" | "low",
    "total": "high" | "medium" | "low"
  },
  "extraction_notes": string or null
}

Rules:
1. Extract ALL line items visible on the receipt. Do not skip any.
2. Tax goes into the "tax" field, NOT into line_items.
3. Do not include subtotals as line items — subtotals are derivable.
4. Amounts must be numbers only. No currency symbols. No commas. Example: 1250.50 not ₹1,250.50
5. If a field is genuinely not present on the receipt, use null. Never guess or fabricate.
6. Confidence scoring:
   - "high" = clearly visible, unambiguous
   - "medium" = partially visible or slightly unclear but reasonable inference
   - "low" = blurry, faded, cut off, or you are unsure
7. If the total on the receipt does not match the sum of line items + tax, extract what is printed. Do not recalculate. Note the discrepancy in extraction_notes.
8. If there are multiple totals on the receipt (subtotal, grand total, amount paid, total payable), always extract the final amount actually paid as the "total" field. When in doubt, prefer the largest bottom-line figure.
9. Optional or charity line items (e.g. "Donate ₹1 towards education") should be included as line items if they appear on the receipt and were charged. Do not skip them.
10. Use extraction_notes to flag anything unusual: torn receipt, handwritten fields, multiple receipts in one image, possible duplicate items, charity/optional charges, split taxes (CGST/SGST), or any field you are uncertain about.
11. If the image is not a receipt at all, return: { "error": "Not a receipt" }
12. If the image is too blurry or dark to extract anything useful, return: { "error": "Image unreadable" }

You are feeding financial data into a personal financial advisory system. Accuracy matters more than completeness. When in doubt, mark confidence as "low" rather than guess.`;

// ─── Anthropic client (active) ──────────────────────────────────────────────

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function parseReceiptImage(
  imagePath: string,
  mimeType: string
): Promise<string> {
  const anthropic = getClient();

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  console.log("\n[Claude] → Sending image to model: claude-sonnet-4-5");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as ImageMediaType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: "Extract the receipt data from this image.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response received from Claude");
  }

  const rawText = textBlock.text;
  console.log("[Claude] ← Raw response:");
  console.log("─".repeat(60));
  console.log(rawText);
  console.log("─".repeat(60) + "\n");

  return rawText;
}

// ─── OpenAI (commented out — swap in if needed) ─────────────────────────────

// import OpenAI from "openai";
//
// let openaiClient: OpenAI | null = null;
//
// function getOpenAIClient(): OpenAI {
//   if (!openaiClient) {
//     const apiKey = process.env.OPENAI_API_KEY;
//     if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
//     openaiClient = new OpenAI({ apiKey });
//   }
//   return openaiClient;
// }
//
// export async function parseReceiptImage(
//   imagePath: string,
//   mimeType: string
// ): Promise<string> {
//   const client = getOpenAIClient();
//   const base64Image = fs.readFileSync(imagePath).toString("base64");
//   const dataUrl = `data:${mimeType};base64,${base64Image}`;
//   const response = await client.chat.completions.create({
//     model: "gpt-4o",
//     max_tokens: 1024,
//     messages: [
//       { role: "system", content: SYSTEM_PROMPT },
//       {
//         role: "user",
//         content: [
//           { type: "image_url", image_url: { url: dataUrl } },
//           { type: "text", text: "Extract the receipt data from this image." },
//         ],
//       },
//     ],
//   });
//   return response.choices[0]?.message?.content ?? "";
// }
