import React, { useRef, useCallback, useEffect, useState } from "react";
import type { FlowNode } from "../types/flow";
import type { SelectedEdge } from "../types/flow";
import {
  NODE_W,
  NODE_H,
  getEdgePath,
  getEdgeMidpoint,
} from "../utils/flow";
import type { ValidationError } from "../types/flow";

interface ConnectingState {
  fromNodeId: string;
  x: number;
  y: number;
}

interface DragState {
  nodeId: string;
  startSvgX: number;
  startSvgY: number;
  origNodeX: number;
  origNodeY: number;
}

interface Props {
  nodes: FlowNode[];
  startNodeId: string | null;
  validationErrors: ValidationError[];
  selectedNodeId: string | null;
  selectedEdge: SelectedEdge | null;
  pan: { x: number; y: number };
  zoom: number;
  onNodeClick: (id: string) => void;
  onEdgeClick: (nodeId: string, edgeId: string) => void;
  onCanvasClick: () => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onConnect: (fromId: string, toId: string) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number | ((z: number) => number)) => void;
  onAddNode: (x: number, y: number) => void;
}

const COLORS = {
  bg: "#0d0f14",
  surface: "#141720",
  surfaceHigh: "#1c2030",
  border: "#2a2f42",
  accent: "#4f9cff",
  accentDim: "#1a3560",
  green: "#3ecf8e",
  red: "#f87171",
  yellow: "#fbbf24",
  textPrimary: "#e8eaf0",
  textSecondary: "#8892a4",
  textDim: "#505870",
  startBg: "#0b1f17",
};

export const Canvas: React.FC<Props> = ({
  nodes,
  startNodeId,
  validationErrors,
  selectedNodeId,
  selectedEdge,
  pan,
  zoom,
  onNodeClick,
  onEdgeClick,
  onCanvasClick,
  onNodeMove,
  onConnect,
  onPanChange,
  onZoomChange,
  onAddNode,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const panRef = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null);

  const toSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      onZoomChange((z) => Math.min(2.5, Math.max(0.25, z * factor)));
    },
    [onZoomChange]
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      const node = nodes.find((n) => n.id === nodeId)!;
      setConnecting({ fromNodeId: nodeId, x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 });
      return;
    }
    onNodeClick(nodeId);
    const pt = toSvgPoint(e.clientX, e.clientY);
    const node = nodes.find((n) => n.id === nodeId)!;
    setDragging({ nodeId, startSvgX: pt.x, startSvgY: pt.y, origNodeX: node.x, origNodeY: node.y });
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.tagName === "svg" || target.tagName === "rect" && target.getAttribute("data-bg")) {
      onCanvasClick();
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origPanX: pan.x,
        origPanY: pan.y,
      };
    }
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const pt = toSvgPoint(e.clientX, e.clientY);
      onNodeMove(
        dragging.nodeId,
        dragging.origNodeX + (pt.x - dragging.startSvgX),
        dragging.origNodeY + (pt.y - dragging.startSvgY)
      );
    }
    if (panRef.current) {
      onPanChange({
        x: panRef.current.origPanX + (e.clientX - panRef.current.startX),
        y: panRef.current.origPanY + (e.clientY - panRef.current.startY),
      });
    }
    if (connecting) {
      const pt = toSvgPoint(e.clientX, e.clientY);
      setConnecting((c) => c ? { ...c, x: pt.x, y: pt.y } : null);
    }
  };

  const onSvgMouseUp = (e: React.MouseEvent) => {
    setDragging(null);
    panRef.current = null;
    if (connecting) {
      const pt = toSvgPoint(e.clientX, e.clientY);
      const target = nodes.find(
        (n) =>
          n.id !== connecting.fromNodeId &&
          pt.x >= n.x && pt.x <= n.x + NODE_W &&
          pt.y >= n.y && pt.y <= n.y + NODE_H
      );
      if (target) onConnect(connecting.fromNodeId, target.id);
      setConnecting(null);
    }
  };

  const onSvgDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.tagName === "svg" || target.getAttribute("data-bg")) {
      const pt = toSvgPoint(e.clientX, e.clientY);
      onAddNode(pt.x, pt.y);
    }
  };

  const nodeHasError = (id: string) =>
    validationErrors.some((e) => e.nodeId === id && e.type === "error");
  const nodeHasWarn = (id: string) =>
    validationErrors.some((e) => e.nodeId === id && e.type === "warning");

  const GRID = 20;

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        userSelect: "none",
        cursor: dragging ? "grabbing" : panRef.current ? "grabbing" : "default",
        background: COLORS.bg,
      }}
      onMouseDown={onSvgMouseDown}
      onMouseMove={onSvgMouseMove}
      onMouseUp={onSvgMouseUp}
      onMouseLeave={onSvgMouseUp}
      onDoubleClick={onSvgDoubleClick}
    >
      <defs>
        <pattern
          id="grid-dots"
          width={GRID * zoom}
          height={GRID * zoom}
          patternUnits="userSpaceOnUse"
          x={pan.x % (GRID * zoom)}
          y={pan.y % (GRID * zoom)}
        >
          <circle cx={GRID * zoom * 0.5} cy={GRID * zoom * 0.5} r="0.9" fill="#2a2f42" />
        </pattern>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#505870" />
        </marker>
        <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={COLORS.accent} />
        </marker>
        <marker id="arrow-connect" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={COLORS.accent} />
        </marker>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Grid */}
      <rect data-bg="true" width="100%" height="100%" fill="url(#grid-dots)" />

      <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
        {/* ── Edges ── */}
        {nodes.map((fromNode) =>
          fromNode.edges.map((edge) => {
            const toNode = nodes.find((n) => n.id === edge.toNodeId);
            if (!toNode) return null;
            const path = getEdgePath(fromNode, toNode);
            const mid = getEdgeMidpoint(fromNode, toNode);
            const isActive =
              selectedEdge?.nodeId === fromNode.id &&
              selectedEdge?.edgeId === edge.id;
            const hasError = validationErrors.some(
              (e) => e.nodeId === fromNode.id && e.edgeId === edge.id && e.type === "error"
            );

            return (
              <g key={`${fromNode.id}-${edge.id}`}>
                {/* Wide invisible hit area */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdgeClick(fromNode.id, edge.id);
                  }}
                />
                <path
                  d={path}
                  fill="none"
                  stroke={hasError ? COLORS.red : isActive ? COLORS.accent : "#2a2f42"}
                  strokeWidth={isActive ? 2 : 1.5}
                  markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{ transition: "stroke 0.15s, stroke-width 0.15s" }}
                />
                {/* Edge label */}
                {edge.condition && (
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={mid.x - 40}
                      y={mid.y - 11}
                      width={80}
                      height={22}
                      rx={5}
                      fill={isActive ? COLORS.accentDim : COLORS.surfaceHigh}
                      stroke={isActive ? COLORS.accent : "#2a2f42"}
                      strokeWidth={1}
                    />
                    <text
                      x={mid.x}
                      y={mid.y + 4.5}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontFamily="JetBrains Mono, monospace"
                      fill={isActive ? COLORS.accent : COLORS.textSecondary}
                    >
                      {edge.condition.length > 12
                        ? edge.condition.slice(0, 12) + "…"
                        : edge.condition}
                    </text>
                  </g>
                )}
              </g>
            );
          })
        )}

        {/* Live connecting line */}
        {connecting && (() => {
          const fn = nodes.find((n) => n.id === connecting.fromNodeId);
          return fn ? (
            <line
              x1={fn.x + NODE_W}
              y1={fn.y + NODE_H / 2}
              x2={connecting.x}
              y2={connecting.y}
              stroke={COLORS.accent}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              markerEnd="url(#arrow-connect)"
            />
          ) : null;
        })()}

        {/* ── Nodes ── */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isStart = startNodeId === node.id;
          const hasError = nodeHasError(node.id);
          const hasWarn = nodeHasWarn(node.id);
          const isDragging = dragging?.nodeId === node.id;

          const borderColor = hasError
            ? COLORS.red
            : isSelected
            ? COLORS.accent
            : isStart
            ? COLORS.green
            : "#2a2f42";

          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={(e) => onNodeMouseDown(e, node.id)}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
              filter={isSelected ? "url(#shadow)" : undefined}
            >
              {/* Selection glow */}
              {isSelected && (
                <rect
                  x={-4}
                  y={-4}
                  width={NODE_W + 8}
                  height={NODE_H + 8}
                  rx={12}
                  fill={COLORS.accent}
                  fillOpacity={0.1}
                />
              )}

              {/* Card body */}
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={isStart ? COLORS.startBg : COLORS.surface}
                stroke={borderColor}
                strokeWidth={isSelected || isStart ? 2 : 1.5}
                style={{ transition: "stroke 0.15s" }}
              />

              {/* Start accent bar */}
              {isStart && (
                <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={COLORS.green} />
              )}

              {/* Icon circle */}
              <circle
                cx={30}
                cy={NODE_H / 2}
                r={16}
                fill={isStart ? `${COLORS.green}1a` : `${COLORS.accent}1a`}
                stroke={isStart ? `${COLORS.green}44` : `${COLORS.accent}44`}
                strokeWidth={1}
              />
              <text
                x={30}
                y={NODE_H / 2 + 5}
                textAnchor="middle"
                fontSize={13}
                fontFamily="system-ui"
              >
                {isStart ? "▶" : "◈"}
              </text>

              {/* Text */}
              <text
                x={56}
                y={NODE_H / 2 - 8}
                fontSize={12}
                fontWeight="600"
                fontFamily="DM Sans, sans-serif"
                fill={COLORS.textPrimary}
              >
                {node.id.length > 18 ? node.id.slice(0, 18) + "…" : node.id}
              </text>
              <text
                x={56}
                y={NODE_H / 2 + 9}
                fontSize={10.5}
                fontFamily="DM Sans, sans-serif"
                fill={COLORS.textSecondary}
              >
                {(node.description || "No description").length > 24
                  ? (node.description || "No description").slice(0, 24) + "…"
                  : node.description || "No description"}
              </text>

              {/* Edge count badge */}
              {node.edges.length > 0 && (
                <g>
                  <circle cx={NODE_W - 12} cy={12} r={10} fill={COLORS.surfaceHigh} stroke="#2a2f42" strokeWidth={1} />
                  <text
                    x={NODE_W - 12}
                    y={16}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="JetBrains Mono, monospace"
                    fill={COLORS.textSecondary}
                  >
                    {node.edges.length}
                  </text>
                </g>
              )}

              {/* Status dot */}
              {hasError && (
                <circle cx={NODE_W - 10} cy={NODE_H - 10} r={5} fill={COLORS.red} />
              )}
              {!hasError && hasWarn && (
                <circle cx={NODE_W - 10} cy={NODE_H - 10} r={5} fill={COLORS.yellow} />
              )}
            </g>
          );
        })}
      </g>

      {/* Empty state */}
      {nodes.length === 0 && (
        <g style={{ pointerEvents: "none" }}>
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            fontSize={48}
            fill="#2a2f42"
            fontFamily="system-ui"
          >
            ◈
          </text>
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            fontSize={14}
            fill="#505870"
            fontFamily="DM Sans, sans-serif"
          >
            Double-click to add a node
          </text>
        </g>
      )}
    </svg>
  );
};
