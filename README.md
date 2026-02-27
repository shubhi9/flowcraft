# flowcraft — Visual Flow Builder

🚀 **Live Demo:** https://flowcraft-ten.vercel.app/

A production-grade visual flow builder built with **React + TypeScript + Vite**. Construct conditional node graphs, edit them visually, and export clean JSON.

## Stack

- **React 18** with functional components and hooks
- **TypeScript** (strict mode) throughout — all types in `src/types/flow.ts`
- **Vite** for dev server and bundling
- **SVG** canvas (no canvas/WebGL library) — edges, nodes, pan/zoom all in a single `<svg>`
- **Zero external UI dependencies** — all components written from scratch

## Getting Started

```bash
npm install
npm run dev        # starts at http://localhost:5173
npm run build      # TypeScript check + Vite build
npm run typecheck  # tsc --noEmit only
```

## Project Structure

```
src/
├── types/
│   └── flow.ts          # All TypeScript interfaces (FlowNode, FlowEdge, ValidationError…)
├── utils/
│   └── flow.ts          # Pure functions: buildExportedFlow, validateFlow, importFlow, geometry
├── hooks/
│   └── useFlowStore.ts  # useFlowStore (all node/edge mutations), useCanvasState (pan/zoom)
├── components/
│   ├── Canvas.tsx        # SVG canvas — rendering + drag/pan/zoom/connect interactions
│   ├── Toolbar.tsx       # Top bar with add, import, zoom, validation badges
│   ├── Sidebar.tsx       # Tab container for Inspector and JSON views; FlowOverview
│   ├── NodeInspector.tsx # Per-node editing panel
│   └── EdgeEditor.tsx    # Per-edge editing with parameters support
└── App.tsx               # Root: wires store → canvas → sidebar, keyboard shortcuts
```

## Features

### Canvas
| Action | How |
|---|---|
| Add node | Toolbar button, or double-click empty canvas |
| Move node | Drag |
| Connect nodes | Shift+drag from source node, release on target |
| Pan | Click+drag empty canvas |
| Zoom | Scroll wheel, toolbar ±, or Ctrl+=/- |

### Inspector (right sidebar)
- Edit node **ID** (validated for uniqueness on blur/Enter)
- Edit **description** (required) and **prompt**
- Manage outgoing **edges**: target node, condition text, optional key-value parameters
- Set **start node** per-node or via the overview dropdown
- Click an edge row to highlight it on the canvas

### JSON Preview
- Live syntax-highlighted JSON output
- Copy to clipboard / Download as `flow.json`
- Paste & Import panel to reconstruct a flow from JSON
- Import via toolbar file picker

### Validation (real-time, inline)
- Duplicate or empty node IDs
- Missing descriptions
- No start node set
- Edge with no target or no condition
- Unreachable nodes (warning, not error)

### Keyboard Shortcuts
| Key | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected node or edge |
| `Ctrl/Cmd` + `=` | Zoom in |
| `Ctrl/Cmd` + `-` | Zoom out |

## JSON Schema

```typescript
interface ExportedFlow {
  start_node_id: string | null;
  nodes: ExportedNode[];
}

interface ExportedNode {
  id: string;
  description: string;
  prompt: string;
  edges: ExportedEdge[];
}

interface ExportedEdge {
  to_node_id: string;
  condition: string;
  parameters?: Record<string, string>; // only present if non-empty
}
```

## Design Decisions

**Strict TypeScript** — `strict: true` in tsconfig, no `any` casts. All domain types live in `src/types/flow.ts` and are imported everywhere.

**Separation of concerns** — state mutations are isolated in `useFlowStore.ts`, pure utility functions (validation, schema building, geometry) are in `utils/flow.ts`, and components are purely presentational.

**SVG canvas without a library** — pan/zoom is a single `<g transform="translate(…) scale(…)">` wrapper. Edges are cubic Bézier paths. This keeps the bundle minimal and the logic readable.

**Edge IDs** — edges carry internal `id` fields (not exported in JSON) so React keys and state updates are stable even when `toNodeId` or `condition` changes.

**Industrial dark aesthetic** — `JetBrains Mono` for IDs/code, `DM Sans` for UI text. Chosen to match the tool-first nature of flow builders.

## Deploy

```bash
npm run build
# dist/ is ready to serve — deploy to Vercel, Netlify, or any static host
```
