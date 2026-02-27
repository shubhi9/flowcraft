import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "./components/Canvas";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { useFlowStore, useCanvasState } from "./hooks/useFlowStore";
import type { SelectedEdge } from "./types/flow";
import {
  validateFlow,
  buildExportedFlow,
  importFlow,
  NODE_W,
  NODE_H,
} from "./utils/flow";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    height: 100%;
    overflow: hidden;
    background: #0d0f14;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #141720; }
  ::-webkit-scrollbar-thumb { background: #2a2f42; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #3d4460; }

  input, textarea, select {
    background: #0d0f14;
    border: 1px solid #2a2f42;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    border-radius: 6px;
    padding: 7px 10px;
    outline: none;
    width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input:focus, textarea:focus, select:focus {
    border-color: #4f9cff;
    box-shadow: 0 0 0 3px #4f9cff22;
  }
  input.error, textarea.error, select.error {
    border-color: #f87171;
    box-shadow: 0 0 0 3px #f8717122;
  }

  button { font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; outline: none; transition: all 0.15s; }

  .btn-primary {
    background: #4f9cff; color: #fff;
    font-size: 13px; font-weight: 600;
    padding: 7px 14px; border-radius: 6px;
  }
  .btn-primary:hover { background: #3d8aee; transform: translateY(-1px); box-shadow: 0 4px 12px #4f9cff33; }
  .btn-primary:active { transform: translateY(0); box-shadow: none; }

  .btn-ghost {
    background: transparent; border: 1px solid #2a2f42;
    color: #8892a4; font-size: 12px; padding: 6px 12px; border-radius: 6px;
  }
  .btn-ghost:hover { border-color: #3d4460; color: #e8eaf0; background: #1c2030; }

  .btn-danger {
    background: transparent; border: 1px solid #3d2020;
    color: #f87171; font-size: 12px; padding: 5px 10px; border-radius: 6px;
  }
  .btn-danger:hover { background: #2a1010; border-color: #f87171; }

  .btn-icon {
    background: #1c2030; border: 1px solid #2a2f42;
    color: #8892a4; width: 28px; height: 28px;
    border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .btn-icon:hover { color: #e8eaf0; border-color: #3d4460; background: #252b3a; }

  label {
    display: block; font-size: 11px; font-weight: 600;
    color: #8892a4; text-transform: uppercase;
    letter-spacing: 0.06em; margin-bottom: 5px;
  }

  .error-text { color: #f87171; font-size: 11px; margin-top: 4px; }

  .json-key { color: #7dd3fc; }
  .json-string { color: #a5d6a7; }
  .json-bool { color: #fbbf24; }
  .json-null { color: #f87171; }
  .json-number { color: #c7a4ff; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in { animation: fadeIn 0.18s ease; }
`;

const App: React.FC = () => {
  const store = useFlowStore();
  const canvas = useCanvasState();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);

  const { nodes, startNodeId } = store.state;

  const validationErrors = useMemo(
    () => validateFlow(nodes, startNodeId),
    [nodes, startNodeId]
  );

  const jsonOutput = useMemo(
    () => JSON.stringify(buildExportedFlow(nodes, startNodeId), null, 2),
    [nodes, startNodeId]
  );

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const inInput = active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || active?.tagName === "SELECT";

      if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
        if (selectedNodeId) {
          store.deleteNode(selectedNodeId);
          setSelectedNodeId(null);
        } else if (selectedEdge) {
          store.deleteEdge(selectedEdge.nodeId, selectedEdge.edgeId);
          setSelectedEdge(null);
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "=" ) {
        e.preventDefault();
        canvas.setZoom((z) => Math.min(2.5, z * 1.15));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        canvas.setZoom((z) => Math.max(0.25, z / 1.15));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, selectedEdge, store, canvas]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddNode = useCallback(
    (x?: number, y?: number) => {
      const id = store.addNode(
        x ?? 200 + nodes.length * 30,
        y ?? 200 + nodes.length * 20
      );
      setSelectedNodeId(id);
      setSelectedEdge(null);
    },
    [store, nodes.length]
  );

  const handleNodeClick = useCallback((id: string) => {
    setSelectedNodeId(id);
    setSelectedEdge(null);
  }, []);

  const handleEdgeClick = useCallback((nodeId: string, edgeId: string) => {
    setSelectedEdge({ nodeId, edgeId });
    setSelectedNodeId(nodeId);
  }, []);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdge(null);
  }, []);

  const handleImport = useCallback(
    (json: string) => {
      const { nodes: imported, startNodeId: sid } = importFlow(json);
      store.loadFlow(imported, sid);
      setSelectedNodeId(null);
      setSelectedEdge(null);
    },
    [store]
  );

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Toolbar
          nodeCount={nodes.length}
          validationErrors={validationErrors}
          zoom={canvas.zoom}
          onAddNode={() => handleAddNode()}
          onImportFile={handleImport}
          onZoomIn={() => canvas.setZoom((z) => Math.min(2.5, z * 1.15))}
          onZoomOut={() => canvas.setZoom((z) => Math.max(0.25, z / 1.15))}
          onResetView={canvas.resetView}
        />

        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          {/* Canvas area */}
          <div style={{ flex: 1, position: "relative" }}>
            <Canvas
              nodes={nodes}
              startNodeId={startNodeId}
              validationErrors={validationErrors}
              selectedNodeId={selectedNodeId}
              selectedEdge={selectedEdge}
              pan={canvas.pan}
              zoom={canvas.zoom}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onCanvasClick={handleCanvasClick}
              onNodeMove={store.moveNode}
              onConnect={store.connectNodes}
              onPanChange={canvas.setPan}
              onZoomChange={canvas.setZoom}
              onAddNode={handleAddNode}
            />

            {/* Canvas hints */}
            <div style={{
              position: "absolute", bottom: 14, left: 14,
              pointerEvents: "none",
            }}>
              <span style={{ fontSize: 10, color: "#505870", fontFamily: "JetBrains Mono, monospace" }}>
                Drag to move  ·  Shift+drag to connect  ·  Double-click to add  ·  Del to delete
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <Sidebar
            nodes={nodes}
            startNodeId={startNodeId}
            selectedNodeId={selectedNodeId}
            selectedEdge={selectedEdge}
            validationErrors={validationErrors}
            jsonOutput={jsonOutput}
            onSetStartNode={store.setStartNode}
            onSelectNode={(id) => { setSelectedNodeId(id); setSelectedEdge(null); }}
            onUpdateNode={store.updateNode}
            onDeleteNode={(id) => { store.deleteNode(id); setSelectedNodeId(null); }}
            onAddEdge={store.addEdge}
            onUpdateEdge={store.updateEdge}
            onDeleteEdge={store.deleteEdge}
            onSelectEdge={setSelectedEdge}
            onAddNode={() => handleAddNode()}
            onImport={handleImport}
          />
        </div>
      </div>
    </>
  );
};

export default App;
