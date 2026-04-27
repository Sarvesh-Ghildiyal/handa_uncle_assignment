import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReceiptField from "../components/ReceiptField";
import { ReceiptData, ReceiptDetail } from "../types";

interface LocationState {
  ai_extraction: ReceiptData;
  image_path: string;
}

export default function Correct() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<ReceiptData | null>(null);
  const [aiExtraction, setAiExtraction] = useState<ReceiptData | null>(null);
  const [imagePath, setImagePath] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Close lightbox on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setZoomed(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Load from navigation state (fresh parse) or fetch existing receipt
  useEffect(() => {
    if (id) {
      setLoading(true);
      fetch(`/api/receipts/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Receipt not found.");
          return res.json();
        })
        .then((receipt: ReceiptDetail) => {
          setData(receipt.corrected_data);
          setImagePath(receipt.image_path);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      const state = location.state as LocationState | null;
      if (!state) {
        navigate("/");
        return;
      }
      setAiExtraction(state.ai_extraction);
      setData({ ...state.ai_extraction });
      setImagePath(state.image_path);
    }
  }, [id, location.state, navigate]);

  const updateField = (field: keyof ReceiptData, value: string | number | null) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const updateLineItem = (index: number, field: "name" | "amount", value: string | number) => {
    if (!data) return;
    const items = [...data.line_items];
    const item = items[index];
    if (!item) return;
    items[index] = { ...item, [field]: value };
    setData({ ...data, line_items: items });
  };

  const removeLineItem = (index: number) => {
    if (!data) return;
    const items = data.line_items.filter((_, i) => i !== index);
    setData({ ...data, line_items: items });
  };

  const addLineItem = () => {
    if (!data) return;
    setData({
      ...data,
      line_items: [...data.line_items, { name: "", amount: 0 }],
    });
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (id) {
        // Update existing receipt
        const res = await fetch(`/api/receipts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ corrected_data: data }),
        });
        if (!res.ok) throw new Error("Failed to update receipt.");
      } else {
        // Save new receipt
        const res = await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ai_extraction: aiExtraction,
            corrected_data: data,
            image_path: imagePath,
          }),
        });
        if (!res.ok) throw new Error("Failed to save receipt.");
      }
      setSuccess(true);
      setTimeout(() => navigate("/receipts"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay fade-in">
        <div className="spinner" />
        <p className="loading-text">Loading receipt...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fade-in">
      {/* ── Lightbox ───────────────────────────────────────── */}
      {zoomed && (
        <div
          className="lightbox-overlay"
          onClick={() => setZoomed(false)}
        >
          <img
            src={`/uploads/${imagePath}`}
            alt="Receipt zoomed"
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lightbox-close"
            onClick={() => setZoomed(false)}
          >
            ✕
          </button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Receipt saved! Redirecting...</div>}

      {data.extraction_notes && (
        <div className="extraction-notes">
          <strong>AI Notes:</strong> {data.extraction_notes}
        </div>
      )}

      <div className="correct-layout" style={{ marginTop: "1rem" }}>
        <div className="receipt-image-panel">
          <img
            src={`/uploads/${imagePath}`}
            alt="Receipt — click to zoom"
            title="Click to zoom"
            onClick={() => setZoomed(true)}
            style={{ cursor: "zoom-in" }}
          />
          <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
            Click image to zoom
          </p>
        </div>

        <div className="receipt-form">
          <ReceiptField
            label="Merchant"
            value={data.merchant}
            confidence={data.confidence.merchant}
            onChange={(v) => updateField("merchant", v)}
            placeholder="Store or business name"
          />

          <ReceiptField
            label="Date"
            value={data.date || ""}
            confidence={data.confidence.date}
            onChange={(v) => updateField("date", v)}
            type="date"
          />

          <ReceiptField
            label="Currency"
            value={data.currency}
            onChange={(v) => updateField("currency", v)}
          />

          {/* Line items */}
          <div className="line-items-section">
            <div className="line-items-header">
              <h3>
                Line Items
                {data.confidence.line_items !== "high" && (
                  <span className={data.confidence.line_items === "low" ? "confidence-danger" : "confidence-warning"}>
                    {" "}⚠️
                  </span>
                )}
              </h3>
            </div>

            {data.line_items.map((item, i) => (
              <div className="line-item-row slide-in" key={i} style={{ animationDelay: `${i * 50}ms` }}>
                <input
                  className={`input ${data.confidence.line_items === "low" ? "input-danger" : data.confidence.line_items === "medium" ? "input-warning" : ""}`}
                  value={item.name}
                  onChange={(e) => updateLineItem(i, "name", e.target.value)}
                  placeholder="Item name"
                />
                <input
                  className={`input ${data.confidence.line_items === "low" ? "input-danger" : data.confidence.line_items === "medium" ? "input-warning" : ""}`}
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) => updateLineItem(i, "amount", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <button className="remove-item-btn" onClick={() => removeLineItem(i)} title="Remove item">
                  ×
                </button>
              </div>
            ))}

            <button className="btn btn-secondary add-item-btn" onClick={addLineItem}>
              + Add item
            </button>
          </div>

          <ReceiptField
            label="Tax"
            value={data.tax !== null && data.tax !== undefined ? String(data.tax) : ""}
            onChange={(v) => updateField("tax", v ? parseFloat(v) : null)}
            type="number"
            placeholder="0.00"
          />

          <ReceiptField
            label="Total"
            value={data.total !== null && data.total !== undefined ? String(data.total) : ""}
            confidence={data.confidence.total}
            onChange={(v) => updateField("total", v ? parseFloat(v) : null)}
            type="number"
            placeholder="0.00"
          />

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : id ? "Update Receipt" : "Save Receipt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
