import type {
  FlowNode,
  FlowEdge,
  ExportedFlow,
  ValidationError,
} from "../types/flow";

// ── ID helpers ────────────────────────────────────────────────────────────────

let _counter = 0;
export const generateNodeId = (): string => `node_${++_counter}`;
export const generateEdgeId = (): string => `edge_${++_counter}`;

export const GRID = 20;
export const NODE_W = 210;
export const NODE_H = 76;

export const snapToGrid = (v: number): number => Math.round(v / GRID) * GRID;

// ── JSON schema builder ───────────────────────────────────────────────────────

export function buildExportedFlow(
  nodes: FlowNode[],
  startNodeId: string | null
): ExportedFlow {
  return {
    start_node_id: startNodeId,
    nodes: nodes.map((n) => ({
      id: n.id,
      description: n.description,
      prompt: n.prompt,
      edges: n.edges.map((e) => ({
        to_node_id: e.toNodeId,
        condition: e.condition,
        ...(Object.keys(e.parameters).length > 0
          ? { parameters: e.parameters }
          : {}),
      })),
    })),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateFlow(
  nodes: FlowNode[],
  startNodeId: string | null
): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeIds = nodes.map((n) => n.id);
  const idSeen = new Set<string>();

  // Global
  if (!startNodeId) {
    errors.push({ type: "error", message: "No start node selected." });
  } else if (!nodeIds.includes(startNodeId)) {
    errors.push({ type: "error", message: "Selected start node no longer exists." });
  }

  nodes.forEach((node) => {
    // ID uniqueness / emptiness
    if (!node.id.trim()) {
      errors.push({ type: "error", nodeId: node.id, field: "id", message: "Node ID cannot be empty." });
    } else if (idSeen.has(node.id)) {
      errors.push({ type: "error", nodeId: node.id, field: "id", message: `Duplicate node ID: "${node.id}".` });
    }
    idSeen.add(node.id);

    // Description required
    if (!node.description.trim()) {
      errors.push({ type: "error", nodeId: node.id, field: "description", message: "Description is required." });
    }

    // Edges
    node.edges.forEach((edge) => {
      if (!edge.toNodeId) {
        errors.push({ type: "error", nodeId: node.id, edgeId: edge.id, message: "Edge has no target node." });
      } else if (!nodeIds.includes(edge.toNodeId)) {
        errors.push({ type: "error", nodeId: node.id, edgeId: edge.id, message: `Target node "${edge.toNodeId}" does not exist.` });
      }
      if (!edge.condition.trim()) {
        errors.push({ type: "error", nodeId: node.id, edgeId: edge.id, message: "Edge condition is required." });
      }
    });
  });

  // Reachability warning
  if (startNodeId && nodeIds.includes(startNodeId)) {
    const reachable = new Set<string>();
    const queue: string[] = [startNodeId];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      if (reachable.has(cur)) continue;
      reachable.add(cur);
      const n = nodes.find((x) => x.id === cur);
      n?.edges.forEach((e) => queue.push(e.toNodeId));
    }
    nodes.forEach((n) => {
      if (!reachable.has(n.id)) {
        errors.push({ type: "warning", nodeId: n.id, message: `Node "${n.id}" is unreachable from the start node.` });
      }
    });
  }

  return errors;
}

// ── Import ────────────────────────────────────────────────────────────────────

export function importFlow(json: string): { nodes: FlowNode[]; startNodeId: string | null } {
  const data = JSON.parse(json) as ExportedFlow;
  if (!data.nodes || !Array.isArray(data.nodes)) {
    throw new Error('Missing "nodes" array in JSON.');
  }
  const nodes: FlowNode[] = data.nodes.map((n, i) => ({
    id: n.id || generateNodeId(),
    description: n.description ?? "",
    prompt: n.prompt ?? "",
    edges: (n.edges ?? []).map(
      (e): FlowEdge => ({
        id: generateEdgeId(),
        toNodeId: e.to_node_id ?? "",
        condition: e.condition ?? "",
        parameters: e.parameters ?? {},
      })
    ),
    x: snapToGrid(100 + (i % 4) * 260),
    y: snapToGrid(100 + Math.floor(i / 4) * 140),
  }));
  return { nodes, startNodeId: data.start_node_id ?? nodes[0]?.id ?? null };
}

// ── Edge path ─────────────────────────────────────────────────────────────────

export function getEdgePath(from: FlowNode, to: FlowNode): string {
  const fx = from.x + NODE_W;
  const fy = from.y + NODE_H / 2;
  const tx = to.x;
  const ty = to.y + NODE_H / 2;
  const cp = Math.abs(tx - fx) * 0.55;
  return `M ${fx} ${fy} C ${fx + cp} ${fy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
}

export function getEdgeMidpoint(from: FlowNode, to: FlowNode): { x: number; y: number } {
  return {
    x: (from.x + NODE_W + to.x) / 2,
    y: (from.y + NODE_H / 2 + to.y + NODE_H / 2) / 2,
  };
}

// ── Syntax highlight ──────────────────────────────────────────────────────────

export function highlightJSON(json: string): string {
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span class="json-key">${match}</span>`;
        return `<span class="json-string">${match}</span>`;
      }
      if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
      if (/null/.test(match)) return `<span class="json-null">${match}</span>`;
      return `<span class="json-number">${match}</span>`;
    }
  );
}
