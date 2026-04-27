import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ReceiptListItem } from "../types";

export default function List() {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/receipts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch receipts.");
        return res.json();
      })
      .then((data: ReceiptListItem[]) => {
        setReceipts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay fade-in">
        <div className="spinner" />
        <p className="loading-text">Loading receipts...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (receipts.length === 0) {
    return (
      <div className="empty-state fade-in">
        <div className="icon">🧾</div>
        <h2>No receipts yet</h2>
        <p>Upload your first receipt to get started.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
          Upload a Receipt
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "No date";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return "—";
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2>Saved Receipts</h2>
        <Link to="/" className="btn btn-primary">
          + New
        </Link>
      </div>

      <div className="receipt-list">
        {receipts.map((r, i) => (
          <Link
            key={r.id}
            to={`/receipts/${r.id}`}
            className="receipt-list-item slide-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <div className="merchant">{r.merchant}</div>
              <div className="meta">{formatDate(r.date)}</div>
            </div>
            <div className="total">{formatCurrency(r.total)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
