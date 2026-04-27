import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ReceiptData } from "../types";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = useCallback((f: File) => {
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      setError("Only JPG and PNG images are supported.");
      return;
    }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  // ─── Paste from clipboard (Cmd+V / Ctrl+V) ─────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            // Clipboard images don't always have the right type — normalize to PNG
            const normalized = new File([blob], "pasted-receipt.png", {
              type: "image/png",
            });
            handleFile(normalized);
            return;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    // Flash the paste hint on mount so user knows it's available
    setPasteHint(true);
    const t = setTimeout(() => setPasteHint(false), 3000);
    return () => {
      window.removeEventListener("paste", handlePaste);
      clearTimeout(t);
    };
  }, [handleFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/receipts/parse", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to parse receipt.");
      }
      const data: { ai_extraction: ReceiptData; image_path: string } =
        await res.json();
      navigate("/correct", {
        state: {
          ai_extraction: data.ai_extraction,
          image_path: data.image_path,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay fade-in">
        <div className="spinner" />
        <p className="loading-text">Extracting receipt data with AI...</p>
        <p className="loading-text" style={{ fontSize: "0.75rem", opacity: 0.6 }}>
          This usually takes 5-10 seconds
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {error && <div className="alert alert-error">{error}</div>}

      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="icon">📄</div>
        <p>Click or drag a receipt photo here</p>
        <p className="hint">
          Supports JPG and PNG, up to 10 MB
          {" · "}
          <span
            style={{
              color: pasteHint ? "var(--accent)" : "inherit",
              transition: "color 0.4s ease",
              fontWeight: pasteHint ? 600 : "inherit",
            }}
          >
            or paste with ⌘V
          </span>
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {preview && (
        <div className="upload-preview fade-in">
          <img src={preview} alt="Receipt preview" />
          <div className="upload-actions">
            <button
              className="btn btn-secondary"
              onClick={() => { setFile(null); setPreview(null); }}
            >
              Remove
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleExtract}>
              Extract Receipt Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
