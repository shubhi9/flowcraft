import React, { useState } from "react";
import type { FlowEdge, FlowNode, ValidationError } from "../types/flow";

interface Props {
  edge: FlowEdge;
  allNodes: FlowNode[];
  nodeId: string;
  errors: ValidationError[];
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (patch: Partial<FlowEdge>) => void;
  onDelete: () => void;
}

const COLORS = {
  border: "#2a2f42",
  borderHover: "#3d4460",
  accent: "#4f9cff",
  accentDim: "#1a3560",
  bg: "#0d0f14",
  surfaceHigh: "#1c2030",
  textSecondary: "#8892a4",
  textDim: "#505870",
  red: "#f87171",
  green: "#3ecf8e",
};

export const EdgeEditor: React.FC<Props> = ({
  edge,
  allNodes,
  nodeId,
  errors,
  isActive,
  onActivate,
  onUpdate,
  onDelete,
}) => {
  const [showParams, setShowParams] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const addParam = () => {
    if (!newKey.trim()) return;
    onUpdate({ parameters: { ...edge.parameters, [newKey.trim()]: newVal } });
    setNewKey("");
    setNewVal("");
  };

  const removeParam = (key: string) => {
    const p = { ...edge.parameters };
    delete p[key];
    onUpdate({ parameters: p });
  };

  const updateParam = (key: string, value: string) => {
    onUpdate({ parameters: { ...edge.parameters, [key]: value } });
  };

  const paramCount = Object.keys(edge.parameters).length;

  return (
    <div
      style={{
        border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
        borderRadius: 8,
        marginBottom: 10,
        background: isActive ? `${COLORS.accent}08` : COLORS.bg,
        overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* Header bar */}
      <div
        onClick={onActivate}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          cursor: "pointer",
          borderBottom: `1px solid ${isActive ? `${COLORS.accent}33` : COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: isActive ? COLORS.accent : COLORS.textDim,
            display: "inline-block", flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: COLORS.textSecondary }}>
            {edge.toNodeId ? `→ ${edge.toNodeId}` : "→ (unset)"}
          </span>
          {edge.condition && (
            <span style={{ fontSize: 10, color: COLORS.textDim }}>
              · {edge.condition.length > 14 ? edge.condition.slice(0, 14) + "…" : edge.condition}
            </span>
          )}
        </div>
        <button
          className="btn-danger"
          style={{ padding: "2px 8px", fontSize: 11 }}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          ✕
        </button>
      </div>

      {/* Fields */}
      <div
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <label>Target Node</label>
          <select
            value={edge.toNodeId}
            onChange={(e) => onUpdate({ toNodeId: e.target.value })}
            className={errors.some((er) => er.message.includes("target") || er.message.includes("Target") || er.message.includes("no target")) ? "error" : ""}
          >
            <option value="">— select node —</option>
            {allNodes
              .filter((n) => n.id !== nodeId)
              .map((n) => (
                <option key={n.id} value={n.id}>{n.id}</option>
              ))}
          </select>
        </div>

        <div>
          <label>Condition</label>
          <input
            value={edge.condition}
            onChange={(e) => onUpdate({ condition: e.target.value })}
            placeholder='e.g. "user_confirmed" or "fallback"'
            className={errors.some((er) => er.message.toLowerCase().includes("condition")) ? "error" : ""}
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}
          />
        </div>

        {/* Validation errors */}
        {errors.map((er, i) => (
          <p key={i} className="error-text">{er.message}</p>
        ))}

        {/* Parameters section */}
        <div>
          <button
            onClick={() => setShowParams((s) => !s)}
            style={{
              background: "none", border: "none",
              color: COLORS.textSecondary,
              fontSize: 11, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
              padding: 0,
            }}
          >
            <span style={{ fontSize: 9, display: "inline-block", transform: showParams ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
            Parameters ({paramCount})
          </button>

          {showParams && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(edge.parameters).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <input
                    value={k}
                    readOnly
                    style={{ flex: 1, fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: COLORS.textSecondary }}
                  />
                  <input
                    value={v}
                    onChange={(e) => updateParam(k, e.target.value)}
                    style={{ flex: 1, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  />
                  <button className="btn-icon" style={{ flexShrink: 0 }} onClick={() => removeParam(k)}>✕</button>
                </div>
              ))}

              <div style={{ display: "flex", gap: 5 }}>
                <input
                  placeholder="key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addParam()}
                  style={{ flex: 1, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                />
                <input
                  placeholder="value"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addParam()}
                  style={{ flex: 1, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                />
                <button className="btn-icon" style={{ flexShrink: 0 }} onClick={addParam} title="Add parameter">+</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
