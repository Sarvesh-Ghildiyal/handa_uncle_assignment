import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { parseReceiptImage } from "../lib/claude";
import { parseReceiptResponse } from "../lib/parser";
import {
  insertReceipt,
  getReceiptById,
  getAllReceipts,
  updateCorrectedData,
  ReceiptData,
} from "../db/queries";

const router = Router();

// Configure multer for image uploads
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG images are allowed."));
    }
  },
});

/**
 * POST /api/receipts/parse
 * Upload a receipt image, send to Claude for extraction.
 * Returns: { ai_extraction: ReceiptData }
 */
router.post(
  "/parse",
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided." });
        return;
      }

      const rawText = await parseReceiptImage(
        req.file.path,
        req.file.mimetype
      );
      const result = parseReceiptResponse(rawText);

      if (!result.success) {
        res.status(422).json({ error: result.error });
        return;
      }

      res.json({
        ai_extraction: result.data,
        image_path: req.file.filename,
      });
    } catch (err) {
      console.error("Parse error:", err);
      res.status(500).json({
        error: "Failed to parse receipt. Please try again.",
      });
    }
  }
);

/**
 * POST /api/receipts
 * Save a receipt with both AI extraction and corrected data.
 * Body: { ai_extraction, corrected_data, image_path }
 * Returns: saved receipt row
 */
router.post("/", (req: Request, res: Response): void => {
  try {
    const { ai_extraction, corrected_data, image_path } = req.body as {
      ai_extraction: ReceiptData;
      corrected_data: ReceiptData;
      image_path: string;
    };

    if (!ai_extraction || !corrected_data || !image_path) {
      res.status(400).json({
        error: "ai_extraction, corrected_data, and image_path are required.",
      });
      return;
    }

    const id = uuidv4();
    const receipt = insertReceipt(id, ai_extraction, corrected_data, image_path);

    res.status(201).json(receipt);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save receipt." });
  }
});

/**
 * GET /api/receipts
 * Returns a list of all saved receipts (summary view).
 */
router.get("/", (_req: Request, res: Response): void => {
  try {
    const receipts = getAllReceipts();
    res.json(receipts);
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ error: "Failed to fetch receipts." });
  }
});

/**
 * GET /api/receipts/:id
 * Returns full receipt record (corrected_data only exposed to user).
 */
router.get("/:id", (req: Request, res: Response): void => {
  try {
    const receipt = getReceiptById(req.params["id"] as string);
    if (!receipt) {
      res.status(404).json({ error: "Receipt not found." });
      return;
    }

    res.json({
      id: receipt.id,
      created_at: receipt.created_at,
      updated_at: receipt.updated_at,
      corrected_data: JSON.parse(receipt.corrected_data),
      image_path: receipt.image_path,
    });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch receipt." });
  }
});

/**
 * PATCH /api/receipts/:id
 * Update the corrected_data for an existing receipt.
 * Body: { corrected_data: ReceiptData }
 */
router.patch("/:id", (req: Request, res: Response): void => {
  try {
    const { corrected_data } = req.body as { corrected_data: ReceiptData };

    if (!corrected_data) {
      res
        .status(400)
        .json({ error: "corrected_data is required." });
      return;
    }

    const updated = updateCorrectedData(req.params["id"] as string, corrected_data);
    if (!updated) {
      res.status(404).json({ error: "Receipt not found." });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update receipt." });
  }
});

export default router;
