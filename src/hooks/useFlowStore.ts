import { useState, useCallback } from "react";
import type { FlowNode, FlowEdge, FlowState, SelectedEdge } from "../types/flow";
import {
  generateNodeId,
  generateEdgeId,
  snapToGrid,
  NODE_W,
  NODE_H,
} from "../utils/flow";

function makeNode(x: number, y: number): FlowNode {
  return {
    id: generateNodeId(),
    description: "",
    prompt: "",
    edges: [],
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
}

const initialNode: FlowNode = {
  id: "welcome",
  description: "Entry point of the flow",
  prompt: "Greet the user and ask what they need help with.",
  edges: [],
  x: 100,
  y: 180,
};

export interface FlowStore {
  state: FlowState;

  // Nodes
  addNode: (x?: number, y?: number) => string;
  deleteNode: (id: string) => void;
  updateNode: (id: string, patch: Partial<Pick<FlowNode, "id" | "description" | "prompt">>) => void;
  moveNode: (id: string, x: number, y: number) => void;
  setStartNode: (id: string) => void;

  // Edges
  addEdge: (nodeId: string) => void;
  connectNodes: (fromId: string, toId: string) => void;
  updateEdge: (nodeId: string, edgeId: string, patch: Partial<FlowEdge>) => void;
  deleteEdge: (nodeId: string, edgeId: string) => void;

  // Import
  loadFlow: (nodes: FlowNode[], startNodeId: string | null) => void;
}

export function useFlowStore(): FlowStore {
  const [state, setState] = useState<FlowState>({
    nodes: [initialNode],
    startNodeId: initialNode.id,
  });

  // ── Nodes ──────────────────────────────────────────────────────────────────

  const addNode = useCallback((x = 300, y = 200): string => {
    const node = makeNode(x, y);
    setState((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
    return node.id;
  }, []);

  const deleteNode = useCallback((id: string) => {
    setState((prev) => ({
      nodes: prev.nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          edges: n.edges.filter((e) => e.toNodeId !== id),
        })),
      startNodeId: prev.startNodeId === id ? null : prev.startNodeId,
    }));
  }, []);

  const updateNode = useCallback(
    (id: string, patch: Partial<Pick<FlowNode, "id" | "description" | "prompt">>) => {
      setState((prev) => {
        const newId = patch.id;
        const nodes = prev.nodes.map((n) => {
          // Update the node itself
          if (n.id === id) return { ...n, ...patch };
          // Update edge references if ID changed
          if (newId && n.edges.some((e) => e.toNodeId === id)) {
            return {
              ...n,
              edges: n.edges.map((e) =>
                e.toNodeId === id ? { ...e, toNodeId: newId } : e
              ),
            };
          }
          return n;
        });
        return {
          nodes,
          startNodeId:
            newId && prev.startNodeId === id ? newId : prev.startNodeId,
        };
      });
    },
    []
  );

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === id ? { ...n, x: snapToGrid(x), y: snapToGrid(y) } : n
      ),
    }));
  }, []);

  const setStartNode = useCallback((id: string) => {
    setState((prev) => ({ ...prev, startNodeId: id }));
  }, []);

  // ── Edges ──────────────────────────────────────────────────────────────────

  const addEdge = useCallback((nodeId: string) => {
    const edge: FlowEdge = {
      id: generateEdgeId(),
      toNodeId: "",
      condition: "",
      parameters: {},
    };
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, edges: [...n.edges, edge] } : n
      ),
    }));
  }, []);

  const connectNodes = useCallback((fromId: string, toId: string) => {
    const edge: FlowEdge = {
      id: generateEdgeId(),
      toNodeId: toId,
      condition: "default",
      parameters: {},
    };
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === fromId ? { ...n, edges: [...n.edges, edge] } : n
      ),
    }));
  }, []);

  const updateEdge = useCallback(
    (nodeId: string, edgeId: string, patch: Partial<FlowEdge>) => {
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                edges: n.edges.map((e) =>
                  e.id === edgeId ? { ...e, ...patch } : e
                ),
              }
            : n
        ),
      }));
    },
    []
  );

  const deleteEdge = useCallback((nodeId: string, edgeId: string) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, edges: n.edges.filter((e) => e.id !== edgeId) }
          : n
      ),
    }));
  }, []);

  // ── Import ─────────────────────────────────────────────────────────────────

  const loadFlow = useCallback(
    (nodes: FlowNode[], startNodeId: string | null) => {
      setState({ nodes, startNodeId });
    },
    []
  );

  return {
    state,
    addNode,
    deleteNode,
    updateNode,
    moveNode,
    setStartNode,
    addEdge,
    connectNodes,
    updateEdge,
    deleteEdge,
    loadFlow,
  };
}

// ── Canvas interaction hook ────────────────────────────────────────────────────

export interface CanvasState {
  pan: { x: number; y: number };
  zoom: number;
  setPan: (pan: { x: number; y: number }) => void;
  setZoom: (zoom: number | ((z: number) => number)) => void;
  resetView: () => void;
}

export function useCanvasState(): CanvasState {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  return { pan, zoom, setPan, setZoom, resetView };
}
