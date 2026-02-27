export interface EdgeParameters {
  [key: string]: string;
}

export interface FlowEdge {
  id: string; // internal only, not exported
  toNodeId: string;
  condition: string;
  parameters: EdgeParameters;
}

export interface FlowNode {
  id: string;
  description: string;
  prompt: string;
  edges: FlowEdge[];
  // Canvas position
  x: number;
  y: number;
}

export interface FlowState {
  nodes: FlowNode[];
  startNodeId: string | null;
}

// ── Exported JSON schema ──────────────────────────────────────────────────────

export interface ExportedEdge {
  to_node_id: string;
  condition: string;
  parameters?: EdgeParameters;
}

export interface ExportedNode {
  id: string;
  description: string;
  prompt: string;
  edges: ExportedEdge[];
}

export interface ExportedFlow {
  start_node_id: string | null;
  nodes: ExportedNode[];
}

// ── Validation ────────────────────────────────────────────────────────────────

export type ValidationErrorType = "error" | "warning";

export interface ValidationError {
  type: ValidationErrorType;
  nodeId?: string;
  edgeId?: string;
  field?: string;
  message: string;
}

export interface SelectedEdge {
  nodeId: string;
  edgeId: string;
}
