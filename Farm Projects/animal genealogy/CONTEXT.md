# SHELAGH — Animal Genealogy Tracker: Context File

Handoff notes in case this conversation migrates to a new Claude session.
Last updated: 2026-04-08.

## What the app is
A single-file HTML app that tracks animal genealogy (father / mother / offspring trees) with:
- Interactive graph visualization via **vis-network** (loaded from CDN, hierarchical layout)
- Multi-sheet support — one sheet per animal type (horses, sheep, etc.), dropdown to switch sheets, rename/delete/new sheet
- Per-animal **Group/Category** label shown above the node in a different font/color (multi-font via vis-network `multi: 'md'`, bold group + ital breed)
- Per-animal details: name, sex, breed, color/markings, DOB, DOD, notes
- **"Copy parents from sibling"** shortcut to speed up entering half-siblings
- **Vaccines received** per animal with a shared catalog that autocompletes across all animals on all sheets
- **Export JSON / Import JSON** for backup and interop
- **Export/Import OPML** for MindNode compatibility (father is the structural parent in OPML)
- **Search** across name, breed, group, color, vaccines
- **Pan/zoom controls** (up/down/left/right, zoom in/out, fit-to-view, 100% reset)
- **Collapsible Animal Details panel** (big light-blue toggle arrow) → graph fills full screen on iPhone
- **Collapsible Move/zoom box** (tiny arrow header) → frees even more graph space; when collapsed, it hugs the top-right corner
- All buttons except **Clear All** live under a **Settings ⚙** dropdown in the header

## Architecture
- **Frontend**: single `index.html` — everything inline (HTML + CSS + JS).
- **Backend**: tiny `server.js` Express app that:
  1. Gates all routes behind **HTTP Basic Auth** using `AUTH_USER` / `AUTH_PASSWORD` env vars (`express-basic-auth`)
  2. Serves static files from its directory
  3. Exposes `GET /api/data` and `PUT /api/data` reading/writing a single JSON file on a persistent disk
- **Persistence**: single JSON blob at `/data/shelagh.json` on a **Railway Volume**, with atomic writes (tmp file + rename). Falls back to `./data/shelagh.json` locally if `/data` isn't writable.
- **Client sync model**:
  - On load: `GET /api/data` first; if unreachable, fall back to `localStorage`.
  - On every mutation: write `localStorage` immediately + debounce a `PUT /api/data` (~600 ms).
  - `localStorage` is a cache/fallback. Server is source of truth so data syncs across devices.
  - Single-user assumption: last write wins (no conflict resolution).

## Files in this folder
```
animal genealogy/
├── index.html       # The app (HTML + CSS + JS, ~1300 lines)
├── server.js        # Express server with basic auth + /api/data endpoints
├── package.json     # Deps: express, express-basic-auth. Script: node server.js
├── .gitignore       # node_modules, .DS_Store, .env, data
└── CONTEXT.md       # This file
```

## Deploy
- **Repo**: https://github.com/claudechopper/animal-genealogy (public)
- **Hosting**: Railway (Hobby $5/mo plan), service auto-deploys on git push to `main`
- **Railway env vars to set in the service → Variables tab**:
  - `AUTH_USER` — username for basic auth
  - `AUTH_PASSWORD` — password for basic auth
- **Railway Volume**: mounted at `/data`, 1 GB (minimum — actual usage is kilobytes)
- **Railway Root Directory** (Settings → Source → Root Directory): must be set to `Farm Projects/animal genealogy` so Railway finds `package.json`. If files ever move, update this setting.
- **Cost**: effectively zero incremental usage for one-friend daily use. Comfortably inside the $5 included.

## Local preview
- `.claude/launch.json` in the dynaflow 2 workspace has a `shelagh` config pointing at the SHELAGH folder via `python3 -m http.server 8765 --directory ...`. After each folder move, this path must be updated.
- NOTE: `python3 -m http.server` does NOT run the Express auth/sync backend — it only serves static files. For full local testing of the auth + `/api/data` flow you need to run `node server.js` with `AUTH_USER` / `AUTH_PASSWORD` set.

## iPad + iPhone responsiveness
- `@media (max-width: 1024px)` — panel tightens to 300px wide, all form inputs bump to 16px font-size (prevents iOS Safari's zoom-on-focus)
- `@media (max-width: 834px)` — panel further tightens to 280px
- **Panel-toggle button** (52×52 round, light blue `#d6e9ff`) — lives in `<main>` (not inside graph-wrapper) so its position stays anchored. Currently positioned `top: 12px; right: 130px;` — sits just left of the collapsed Move box with ~10px gap.
- **Graph-controls collapse-toggle** (40×40, light blue) — collapses the Move/Zoom box down to just its header; when collapsed, the whole box moves to `top: 12px` so it hugs the corner and doesn't obscure the graph.

## Folder structure (current)
```
/Users/Claude/ALL CLAUDE STUFF/PROJECTS (ACTIVE)/SHELAGH PROJECTS/SHELAGH/
└── Farm Projects/
    └── animal genealogy/
        ├── index.html
        ├── server.js
        ├── package.json
        ├── .gitignore
        └── CONTEXT.md
```

## Data model
```js
book = {
  sheets: [
    {
      id: 's-xxx',
      name: 'Horses',
      animals: [
        {
          id: 'a-xxx',
          name: 'Bella',
          sex: 'F',            // 'M' | 'F' | 'U'
          breed: 'Border Collie',
          group: 'Group 1',
          groupColor: '#ff9500',
          color: 'black and white',
          dob: '2020-03-15',
          dod: '',
          fatherId: 'a-yyy',
          motherId: 'a-zzz',
          vaccines: ['Rabies', 'Distemper'],
          notes: '...'
        }
      ]
    }
  ],
  activeSheetId: 's-xxx',
  vaccines: ['Rabies', 'Distemper', ...] // shared catalog across all sheets
}
```
Storage key: `shelagh.book.v2` in localStorage. Legacy key migrated on first load: `shelagh.animals.v1`.

## Key functions in index.html
- `loadAnimals()` — async, fetches server first then localStorage
- `saveAnimals()` — writes localStorage + schedules server sync (debounced 600ms)
- `scheduleServerSync(delayMs)` — PUT /api/data debounced
- `normalizeBook(b)` — repairs missing fields on load
- `activeSheet()`, `switchSheet(id)`, `newSheet()`, `renameSheet()`, `deleteSheet()`
- `getVaccineCatalog()`, `addToVaccineCatalog(name)` — shared vaccine registry
- `populateParentDropdowns(excludeId)` — excludes self + descendants to prevent cycles
- `buildNode(a)` — vis-network node with multi-font label (bold colored group + ital breed)
- `buildEdges(a)` — blue arrow father→child, pink arrow mother→child
- `renderGraph()`, `renderSheetBar()`
- `pan(dx, dy)`, `zoomBy(factor)`, `resetZoom()`, `fitView()`
- `buildOpmlForSheet(sheet)`, `importOPML(file)`
- `handleSearch(query)`
- Panel toggle handler: `#panel-toggle` click → toggles `#panel.collapsed`, swaps arrow ◀/▶, calls `network.redraw()` + `network.fit()` so vis-network re-measures
- Graph-controls toggle: `#ctrl-toggle` → toggles `#graph-controls.collapsed`, swaps arrow ▼/▲

## Things the user cares about (recurring preferences)
- Never sell user data under any circumstances (ethical default across all projects)
- Wants it to **just work** on iPhone / iPad / computer for a friend with no tech background
- Wants one simple password login the friend can use, no user accounts
- Wants cross-device sync without her having to know what that means
- Wants export/import JSON always available as a manual backup escape hatch
- When asking to "move folders" she usually means moving inside the existing tree, not out to a new parent
- Wants concise answers — single paragraph summaries when she asks for them
- The folder is spelled "SHELAGH" (all caps). She has renamed/moved it externally a few times during development.

## Outstanding todos / known issues
- The stray `claudechopper/shelagh` GitHub repo (created early in the session before realizing `animal-genealogy` already existed) still exists on GitHub. Our gh token lacks `delete_repo` scope — user needs to delete it manually at https://github.com/claudechopper/shelagh/settings or grant `delete_repo` scope via `gh auth refresh -h github.com -s delete_repo`.
- After moving files into `Farm Projects/animal genealogy/`, Railway's **Root Directory** setting must be updated to match, otherwise the deploy will fail to find `package.json`.
- After each folder rename, `.claude/launch.json` in the dynaflow 2 workspace needs its path updated for local preview to work.
- Not suitable for simultaneous multi-device editing (no conflict resolution — last write wins).
- HTTP Basic Auth credentials stay cached by the browser until all tabs are closed; no explicit logout UI.

## Git status
- Remote: `origin` → https://github.com/claudechopper/animal-genealogy.git
- Branch: `main`
- Recent commits (newest first):
  - Move files into Farm Projects/animal genealogy subfolder
  - Move project files into Farm Projects subfolder
  - Position panel toggle just left of Move box with small gap
  - Anchor panel toggle to viewport edge so it never overlaps Move box
  - Pull collapsed Move box up to the top edge to free more graph space
  - Nudge graph controls down to avoid overlap with panel toggle on iPhone
  - Light blue background for collapse toggles
  - Collapsible panel + collapsible graph controls with large toggle arrows
  - iPad-friendly: tighter panel + 16px inputs to prevent iOS zoom-on-focus
  - Server-side sync: GET/PUT /api/data backed by Railway volume
  - Add HTTP basic auth via env vars (AUTH_USER / AUTH_PASSWORD)
  - Multi-sheet, groups, vaccines, OPML, settings menu
  - Initial commit: SHELAGH animal genealogy tracker
