import React, { useState, useEffect } from "react";
import type { FlowNode, FlowEdge, ValidationError, SelectedEdge } from "../types/flow";
import { EdgeEditor } from "./EdgeEditor";

interface Props {
  node: FlowNode;
  allNodes: FlowNode[];
  isStart: boolean;
  validationErrors: ValidationError[];
  selectedEdge: SelectedEdge | null;
  onUpdate: (patch: Partial<Pick<FlowNode, "id" | "description" | "prompt">>) => void;
  onDelete: () => void;
  onSetStart: () => void;
  onAddEdge: () => void;
  onUpdateEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
  onDeleteEdge: (edgeId: string) => void;
  onSelectEdge: (sel: SelectedEdge | null) => void;
}

export const NodeInspector: React.FC<Props> = ({
  node,
  allNodes,
  isStart,
  validationErrors,
  selectedEdge,
  onUpdate,
  onDelete,
  onSetStart,
  onAddEdge,
  onUpdateEdge,
  onDeleteEdge,
  onSelectEdge,
}) => {
  const [idDraft, setIdDraft] = useState(node.id);
  const [idError, setIdError] = useState<string | null>(null);

  // Reset draft when node changes
  useEffect(() => {
    setIdDraft(node.id);
    setIdError(null);
  }, [node.id]);

  const allIds = allNodes.map((n) => n.id);

  const commitId = () => {
    const v = idDraft.trim();
    if (!v) {
      setIdError("Node ID cannot be empty.");
      return;
    }
    if (v !== node.id && allIds.includes(v)) {
      setIdError(`"${v}" is already in use.`);
      return;
    }
    setIdError(null);
    if (v !== node.id) onUpdate({ id: v });
  };

  const fieldError = (field: string) =>
    validationErrors.find((e) => e.nodeId === node.id && e.field === field)?.message;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {isStart && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#3ecf8e",
              background: "#3ecf8e22", padding: "2px 8px", borderRadius: 4,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              Start
            </span>
          )}
          <span style={{ fontSize: 11, color: "#505870", fontFamily: "JetBrains Mono, monospace" }}>
            {node.edges.length} edge{node.edges.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!isStart && (
            <button className="btn-ghost" style={{ fontSize: 11 }} onClick={onSetStart}>
              Set as Start
            </button>
          )}
          <button className="btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      {/* Node ID */}
      <div>
        <label>Node ID</label>
        <input
          value={idDraft}
          onChange={(e) => { setIdDraft(e.target.value); setIdError(null); }}
          onBlur={commitId}
          onKeyDown={(e) => e.key === "Enter" && commitId()}
          placeholder="unique-node-id"
          className={idError || fieldError("id") ? "error" : ""}
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
        />
        {(idError || fieldError("id")) && (
          <p className="error-text">{idError ?? fieldError("id")}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label>Description <span style={{ color: "#f87171" }}>*</span></label>
        <textarea
          rows={2}
          value={node.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="What does this node represent?"
          className={fieldError("description") ? "error" : ""}
          style={{ resize: "vertical" }}
        />
        {fieldError("description") && (
          <p className="error-text">{fieldError("description")}</p>
        )}
      </div>

      {/* Prompt */}
      <div>
        <label>Prompt</label>
        <textarea
          rows={3}
          value={node.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder="e.g. Ask the user for their order number."
          style={{ resize: "vertical" }}
        />
      </div>

      {/* Edges */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ margin: 0 }}>Outgoing Edges</label>
          <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={onAddEdge}>
            + Add Edge
          </button>
        </div>

        {node.edges.length === 0 ? (
          <p style={{ color: "#505870", fontSize: 12, fontStyle: "italic", lineHeight: 1.5 }}>
            No outgoing edges yet. Click "+ Add Edge" or Shift+drag on the canvas.
          </p>
        ) : (
          node.edges.map((edge) => {
            const edgeErrors = validationErrors.filter(
              (e) => e.nodeId === node.id && e.edgeId === edge.id
            );
            const isActive =
              selectedEdge?.nodeId === node.id && selectedEdge?.edgeId === edge.id;
            return (
              <EdgeEditor
                key={edge.id}
                edge={edge}
                allNodes={allNodes}
                nodeId={node.id}
                errors={edgeErrors}
                isActive={isActive}
                onActivate={() =>
                  onSelectEdge(
                    isActive ? null : { nodeId: node.id, edgeId: edge.id }
                  )
                }
                onUpdate={(patch) => onUpdateEdge(edge.id, patch)}
                onDelete={() => onDeleteEdge(edge.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
