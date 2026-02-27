import React, { useRef } from "react";
import type { ValidationError } from "../types/flow";

interface Props {
  nodeCount: number;
  validationErrors: ValidationError[];
  zoom: number;
  onAddNode: () => void;
  onImportFile: (text: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const Toolbar: React.FC<Props> = ({
  nodeCount,
  validationErrors,
  zoom,
  onAddNode,
  onImportFile,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errCount = validationErrors.filter((e) => e.type === "error").length;
  const warnCount = validationErrors.filter((e) => e.type === "warning").length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onImportFile(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{
      height: 52,
      background: "#141720",
      borderBottom: "1px solid #2a2f42",
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      gap: 10,
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 6 }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="1" y="1" width="20" height="20" rx="5" fill="#4f9cff" fillOpacity="0.15" stroke="#4f9cff" strokeWidth="1.5" />
          <circle cx="7" cy="11" r="2.5" fill="#4f9cff" />
          <circle cx="15" cy="7" r="2.5" fill="#3ecf8e" />
          <circle cx="15" cy="15" r="2.5" fill="#fbbf24" />
          <path d="M9.5 10.8H13M13 10.8L13.2 7.5M13 10.8L13.2 14.5" stroke="#505870" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span style={{
          fontFamily: "JetBrains Mono, monospace",
          fontWeight: 600, fontSize: 14,
          color: "#e8eaf0", letterSpacing: "-0.02em",
        }}>
          flowcraft
        </span>
      </div>

      <div style={{ width: 1, height: 24, background: "#2a2f42" }} />

      <button className="btn-primary" onClick={onAddNode} style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Node
      </button>

      <button
        className="btn-ghost"
        onClick={() => fileInputRef.current?.click()}
        style={{ display: "flex", alignItems: "center", gap: 5 }}
      >
        ↑ Import JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ flex: 1 }} />

      {/* Validation badges */}
      {errCount > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "#1a0d0d", border: "1px solid #f8717155",
          borderRadius: 4, padding: "2px 8px",
          fontSize: 11, color: "#f87171",
        }}>
          ✕ {errCount} error{errCount > 1 ? "s" : ""}
        </span>
      )}
      {warnCount > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "#1a1500", border: "1px solid #fbbf2455",
          borderRadius: 4, padding: "2px 8px",
          fontSize: 11, color: "#fbbf24",
        }}>
          ⚠ {warnCount} warning{warnCount > 1 ? "s" : ""}
        </span>
      )}
      {errCount === 0 && warnCount === 0 && nodeCount > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "#0b1f17", border: "1px solid #3ecf8e55",
          borderRadius: 4, padding: "2px 8px",
          fontSize: 11, color: "#3ecf8e",
        }}>
          ✓ Valid
        </span>
      )}

      <div style={{ width: 1, height: 24, background: "#2a2f42" }} />

      {/* Zoom controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#505870", fontFamily: "JetBrains Mono, monospace", minWidth: 36, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button className="btn-icon" onClick={onZoomOut} title="Zoom out">−</button>
        <button className="btn-icon" onClick={onZoomIn} title="Zoom in">+</button>
        <button className="btn-icon" onClick={onResetView} title="Reset view">⊙</button>
      </div>
    </div>
  );
};
