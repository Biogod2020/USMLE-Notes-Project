# Knowledge Engine (React + Tauri)

An interactive knowledge browser for USMLE-style notes. The app loads one or more JSON knowledge files, normalizes the topics, and lets you explore them through searchable trees, detail panes, and force-directed or ReactFlow graphs. The desktop build runs as a Tauri shell so it can read local folders securely.

## Key Features

- File-aware knowledge loading: pick a directory of JSON files and toggle them on/off without rebuilding.
- Smart navigation: hierarchical tree, fuzzy search (Fuse.js), breadcrumb-aware topic view, and quick popovers when hovering cross-links.
- Dual graph experiences: classic vis-network physics mode plus a ReactFlow layout with semantic filters.
- Toasted feedback and responsive panels optimized for wide and mobile layouts.
- (New) Schema validation and data-health reporting so malformed topics never surprise you.
- (New) Topic editor drawer with in-app drafting: tweak titles, tags, custom content sections, and relationships (add/remove connections) while we wire up file persistence.

## Prerequisites

- Node.js 18+
- npm 10+
- Rust toolchain + Tauri prerequisites (for desktop builds). Follow the [Tauri setup guide](https://tauri.app/start/prerequisites/) for your OS.

## Getting Started

```bash
npm install
```

### Run the web dev server

```bash
npm run dev
```

### Run the Tauri desktop shell

```bash
npm run tauri dev
```

### Build for production

```bash
npm run build          # Vite build (outputs to dist/)
npm run tauri build    # Desktop bundle (requires Rust toolchain)
```

## Mobile Development

### iOS

To develop for iOS, you must start the Tauri development server before running the app in Xcode. This ensures the app can connect to the frontend dev server.

1. Start the iOS development server:
   ```bash
   npm run tauri ios dev
   ```
2. This will automatically open Xcode.
3. In Xcode, select your target simulator or device and click "Run".

**Note:** If you see a "Connection refused" error in Xcode, it likely means the `tauri ios dev` server is not running or has stopped.

## Knowledge File Format

Each `.json` file is a dictionary where the keys are stable topic IDs and the values describe a topic. A trimmed example:

```json
{
  "gastrointestinal_embryology": {
    "title": "Gastrointestinal Embryology",
    "primaryType": "process",
    "classificationPath": ["Embryology", "Organogenesis"],
    "tags": ["Embryology"],
    "content": {
      "definition": "...",
      "atAGlance": "<ul>…</ul>",
      "takeAway": "..."
    },
    "connections": [
      { "type": "has_component_process", "to": "foregut_development" }
    ]
  }
}
```

`sample_input.json` contains a richer data set you can point the app to during development. The loader silently ignores keys that start with `zzz_`, allowing you to stash templates or drafts in the same file.

### Validation Rules

The runtime applies a Zod schema when loading each topic. If a topic fails validation (missing IDs, invalid connections, non-object content, etc.) it is skipped and recorded:

- Invalid topics are counted per file and surfaced through the status bar and toast notifications.
- Files with fatal JSON errors stay unchecked so you can fix them before reloading.
- The rest of the file still loads, so a single malformed topic never blocks the entire knowledge base.

## UI Map

- **Nav panel**: directory selector, file toggles, theme switcher, fuzzy search, hierarchy tree, and load status.
- **Topic view**: detail card with breadcrumbs, related-topic buttons, and “open graph” action.
- **Connections panel**: highlights inbound/outbound relationships for the active topic.
- **Graph modal**: choose between the classic vis-network force layout or the modern ReactFlow layout that adds semantic filters, legends, and expandable neighborhoods.

## Testing

Unit tests run through Vitest + React Testing Library:

```bash
npm test
```

Add new specs under `src/components/__tests__/` or alongside hooks to keep coverage close to the code they exercise.

## Troubleshooting

- **No topics appear**: make sure you selected a directory, toggled at least one JSON file, and the status bar does not mention validation failures.
- **Validation warnings**: open the offending JSON file, fix the reported topic, and toggle the file off/on to reload.
- **Desktop build cannot access files**: ensure you granted the Tauri app read permissions on macOS the first time the dialog opened.

Contributions that improve the authoring workflow, graph analytics, or automated tests are welcome—see the roadmap in the issue tracker for active ideas.
