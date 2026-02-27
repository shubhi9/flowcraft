import React, { useState, useRef } from "react";
import type { FlowNode, FlowEdge, ValidationError, SelectedEdge } from "../types/flow";
import { NodeInspector } from "./NodeInspector";
import { highlightJSON } from "../utils/flow";

type SidebarTab = "inspector" | "json";

interface Props {
  nodes: FlowNode[];
  startNodeId: string | null;
  selectedNodeId: string | null;
  selectedEdge: SelectedEdge | null;
  validationErrors: ValidationError[];
  jsonOutput: string;
  onSetStartNode: (id: string) => void;
  onSelectNode: (id: string) => void;
  onUpdateNode: (id: string, patch: Partial<Pick<FlowNode, "id" | "description" | "prompt">>) => void;
  onDeleteNode: (id: string) => void;
  onAddEdge: (nodeId: string) => void;
  onUpdateEdge: (nodeId: string, edgeId: string, patch: Partial<FlowEdge>) => void;
  onDeleteEdge: (nodeId: string, edgeId: string) => void;
  onSelectEdge: (sel: SelectedEdge | null) => void;
  onAddNode: () => void;
  onImport: (json: string) => void;
}

const COLORS = {
  surface: "#141720",
  surfaceHigh: "#1c2030",
  border: "#2a2f42",
  accent: "#4f9cff",
  green: "#3ecf8e",
  red: "#f87171",
  yellow: "#fbbf24",
  textPrimary: "#e8eaf0",
  textSecondary: "#8892a4",
  textDim: "#505870",
  bg: "#0d0f14",
};

export const Sidebar: React.FC<Props> = ({
  nodes,
  startNodeId,
  selectedNodeId,
  selectedEdge,
  validationErrors,
  jsonOutput,
  onSetStartNode,
  onSelectNode,
  onUpdateNode,
  onDeleteNode,
  onAddEdge,
  onUpdateEdge,
  onDeleteEdge,
  onSelectEdge,
  onAddNode,
  onImport,
}) => {
  const [tab, setTab] = useState<SidebarTab>("inspector");
  const [copied, setCopied] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const globalErrors = validationErrors.filter((e) => !e.nodeId);
  const errCount = validationErrors.filter((e) => e.type === "error").length;
  const warnCount = validationErrors.filter((e) => e.type === "warning").length;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      onImport(importText);
      setImportText("");
      setImportMode(false);
      setImportError("");
    } catch (e) {
      setImportError((e as Error).message);
    }
  };

  return (
    <div style={{
      width: 340,
      borderLeft: `1px solid ${COLORS.border}`,
      background: COLORS.surface,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        {(["inspector", "json"] as SidebarTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t ? COLORS.accent : "transparent"}`,
              color: tab === t ? COLORS.accent : COLORS.textSecondary,
              padding: "12px 0",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 0.15s",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {t === "inspector" ? "Inspector" : "JSON"}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "inspector" ? (
          selectedNode ? (
            <NodeInspector
              node={selectedNode}
              allNodes={nodes}
              isStart={startNodeId === selectedNode.id}
              validationErrors={validationErrors}
              selectedEdge={selectedEdge}
              onUpdate={(patch) => onUpdateNode(selectedNode.id, patch)}
              onDelete={() => onDeleteNode(selectedNode.id)}
              onSetStart={() => onSetStartNode(selectedNode.id)}
              onAddEdge={() => onAddEdge(selectedNode.id)}
              onUpdateEdge={(edgeId, patch) => onUpdateEdge(selectedNode.id, edgeId, patch)}
              onDeleteEdge={(edgeId) => onDeleteEdge(selectedNode.id, edgeId)}
              onSelectEdge={onSelectEdge}
            />
          ) : (
            <FlowOverview
              nodes={nodes}
              startNodeId={startNodeId}
              globalErrors={globalErrors}
              validationErrors={validationErrors}
              errCount={errCount}
              warnCount={warnCount}
              onSetStartNode={onSetStartNode}
              onSelectNode={onSelectNode}
              onAddNode={onAddNode}
            />
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="btn-ghost" onClick={handleCopy} style={{ flex: 1, fontSize: 11 }}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
              <button className="btn-ghost" onClick={handleDownload} style={{ flex: 1, fontSize: 11 }}>
                ↓ Download
              </button>
              <button
                className="btn-ghost"
                onClick={() => setImportMode((m) => !m)}
                style={{
                  flex: 1, fontSize: 11,
                  color: importMode ? COLORS.accent : undefined,
                  borderColor: importMode ? COLORS.accent : undefined,
                }}
              >
                ↑ Import
              </button>
            </div>

            {importMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
                  placeholder="Paste flow JSON here..."
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, resize: "vertical" }}
                  className={importError ? "error" : ""}
                />
                {importError && <p className="error-text">{importError}</p>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleImport}>Import</button>
                  <button className="btn-ghost" onClick={() => { setImportMode(false); setImportError(""); }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{
              flex: 1,
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              overflow: "auto",
              padding: 14,
            }}>
              <pre
                style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.75, margin: 0 }}
                dangerouslySetInnerHTML={{ __html: highlightJSON(jsonOutput) }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Flow Overview (no node selected) ─────────────────────────────────────────

interface OverviewProps {
  nodes: FlowNode[];
  startNodeId: string | null;
  globalErrors: ValidationError[];
  validationErrors: ValidationError[];
  errCount: number;
  warnCount: number;
  onSetStartNode: (id: string) => void;
  onSelectNode: (id: string) => void;
  onAddNode: () => void;
}

const FlowOverview: React.FC<OverviewProps> = ({
  nodes,
  startNodeId,
  globalErrors,
  validationErrors,
  errCount,
  warnCount,
  onSetStartNode,
  onSelectNode,
  onAddNode,
}) => {
  const COLORS_LOCAL = {
    border: "#2a2f42",
    bg: "#0d0f14",
    textPrimary: "#e8eaf0",
    textSecondary: "#8892a4",
    textDim: "#505870",
    red: "#f87171",
    yellow: "#fbbf24",
    green: "#3ecf8e",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS_LOCAL.textPrimary, marginBottom: 4 }}>
          Flow Overview
        </h3>
        <p style={{ fontSize: 12, color: COLORS_LOCAL.textDim, lineHeight: 1.5 }}>
          Click a node to inspect it, or double-click the canvas to add one.
        </p>
      </div>

      {/* Validation summary */}
      {(errCount > 0 || warnCount > 0) && (
        <div style={{
          background: "#1a0d0d", border: "1px solid #f8717133",
          borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4,
        }}>
          {errCount > 0 && (
            <p style={{ color: COLORS_LOCAL.red, fontSize: 12 }}>
              ✕ {errCount} error{errCount > 1 ? "s" : ""} must be fixed before export.
            </p>
          )}
          {warnCount > 0 && (
            <p style={{ color: COLORS_LOCAL.yellow, fontSize: 12 }}>
              ⚠ {warnCount} warning{warnCount > 1 ? "s" : ""}.
            </p>
          )}
          {globalErrors.map((e, i) => (
            <p key={i} style={{ color: COLORS_LOCAL.red, fontSize: 11, marginTop: 4 }}>
              · {e.message}
            </p>
          ))}
        </div>
      )}

      {errCount === 0 && warnCount === 0 && nodes.length > 0 && (
        <div style={{
          background: "#0b1f17", border: "1px solid #3ecf8e33",
          borderRadius: 8, padding: 10,
        }}>
          <p style={{ color: COLORS_LOCAL.green, fontSize: 12 }}>✓ Flow is valid.</p>
        </div>
      )}

      {/* Start node */}
      <div>
        <label>Start Node</label>
        <select
          value={startNodeId ?? ""}
          onChange={(e) => onSetStartNode(e.target.value)}
          className={!startNodeId ? "error" : ""}
        >
          <option value="">— select start node —</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>{n.id}</option>
          ))}
        </select>
        {!startNodeId && <p className="error-text">A start node is required.</p>}
      </div>

      {/* Node list */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ margin: 0 }}>Nodes ({nodes.length})</label>
          <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={onAddNode}>+ Add</button>
        </div>

        {nodes.map((n) => {
          const nodeErrs = validationErrors.filter((e) => e.nodeId === n.id && e.type === "error");
          const nodeWarns = validationErrors.filter((e) => e.nodeId === n.id && e.type === "warning");
          const borderColor = nodeErrs.length
            ? COLORS_LOCAL.red
            : nodeWarns.length
            ? COLORS_LOCAL.yellow
            : COLORS_LOCAL.border;

          return (
            <div
              key={n.id}
              onClick={() => onSelectNode(n.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${borderColor}`,
                background: COLORS_LOCAL.bg,
                marginBottom: 6,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {startNodeId === n.id && (
                  <span style={{ fontSize: 10, color: COLORS_LOCAL.green }}>▶</span>
                )}
                <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: COLORS_LOCAL.textPrimary }}>
                  {n.id}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: COLORS_LOCAL.textDim }}>{n.edges.length}→</span>
                {nodeErrs.length > 0 && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS_LOCAL.red, display: "inline-block" }} />
                )}
                {!nodeErrs.length && nodeWarns.length > 0 && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS_LOCAL.yellow, display: "inline-block" }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
