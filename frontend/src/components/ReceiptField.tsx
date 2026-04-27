import { ConfidenceLevel } from "../types";

interface ReceiptFieldProps {
  label: string;
  value: string;
  confidence?: ConfidenceLevel;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
}

export default function ReceiptField({
  label,
  value,
  confidence,
  onChange,
  type = "text",
  placeholder,
}: ReceiptFieldProps) {
  const getInputClass = (): string => {
    if (!confidence || confidence === "high") return "input";
    if (confidence === "medium") return "input input-warning";
    return "input input-danger";
  };

  const getConfidenceBadge = (): string | null => {
    if (!confidence || confidence === "high") return null;
    return "⚠️";
  };

  const getConfidenceClass = (): string => {
    if (confidence === "medium") return "confidence-warning";
    if (confidence === "low") return "confidence-danger";
    return "";
  };

  return (
    <div className="field-group fade-in">
      <label className="field-label">
        {label}
        {getConfidenceBadge() && (
          <span className={`confidence-badge ${getConfidenceClass()}`}>
            {getConfidenceBadge()}{" "}
            {confidence === "low" ? "Low confidence" : "Medium confidence"}
          </span>
        )}
      </label>
      <input
        className={getInputClass()}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
