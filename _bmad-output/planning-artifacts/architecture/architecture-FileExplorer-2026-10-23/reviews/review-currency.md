# Review: currency / reality-check — ARCHITECTURE-SPINE.md (חיפוש מתקדם)

Date: 2026-10-23. Method: spine vs package.json, node_modules, and src/. Read-only; spine not edited.

## Verdict
CONDITIONAL PASS. Stack table and most claims about existing code are true. But several committed decisions rest on unverified assumptions, and the spine under-states the blast radius on existing code (App routing, FileList/StatusBar/nameSearch, SearchBox name collision, per-file stat cost in listEntries). No external source or date is cited for any technology claim.

## Confirmed (true in code)
- Stack: package.json ranges match the table exactly (react ^19.2.8, TS ~6.0.2, vite ^8.3.0, vitest ^4.0.0, oxlint ^1.81.0). Installed: react/react-dom 19.3.1, vite 8.3.4, vitest 4.1.11, typescript 6.0.3, oxlint 1.88.0 — all within range. "No new dependency" holds.
- explorerReducer exists with `selection`, `history`, `enter()`, action `search`, field `searchQuery`; ExplorerProvider (src/state/ExplorerContext.tsx) exists; FsError with codes `permission | not-found | unsupported | unknown` exists in src/lib/fileSystem.ts; FileSystemAdapter has isSupported/pickFolder/listEntries/listSubfolders/getFile.
- Entry ids: `${parent.id}/${name}` for files and folders (BrowserFileSystemAdapter.toEntry/registerFolder); roots are `rootN`. Globally unique within a session — AD-7 claim true.
- AbortController already used in repo (pdf.ts, FileInfo.tsx) — AD-3 fits existing idiom. AsyncGenerator / `for await` over `dir.entries()` is already used by the adapter; no `async *` exists in lib yet (new pattern, but standard).
- `enter()` currently resets selection/anchor/typeFilter/searchQuery/entries; `select?: id` on navigate is a NEW feature (spine words it as something enter() "implements" — fine as a plan, not an existing behavior).
- DetailsPane and StatusBar both read `state` directly today (DetailsPane: `state.selection`/`state.entries`), so routing them through `useSelectedEntry()` is a real change, as spine implies. NOTE: StatusBar does not use the selected entry at all, only `selection.length`; "StatusBar reads only useSelectedEntry" is incomplete (it needs counts/summary of the folder).

## Findings (ordered by severity)

### F1 (high) — listEntries cost is unacknowledged; SM-1/SM-2 rest on it
`BrowserFileSystemAdapter.listEntries` calls `handle.getFile()` for EVERY file (Promise.all) to read size/modified/mime, and registers every handle in the `files`/`folders` Maps (unbounded growth over a 10k-file scan; handles never evicted). AD-1 forbids adding adapter methods and mandates `listEntries`, but a name-only search does not need stats. Spine only flags "dispatch per result" as an assumption; this larger, verified cost is not mentioned. Also `resolve()` runs queryPermission/requestPermission per folder; requestPermission outside a user gesture fails and is mapped to `permission`, so the scan would silently skip subtrees (consistent with AD-8 but should be stated). Recommend: perf-test early on a real 10k tree, or reconsider AD-1 (e.g. an optional lightweight name-only listing).

### F2 (high) — Blast radius on existing code understated; "nameSearch.ts and reducer `search` deleted" (AD-4)
Verified consumers: `nameSearch` is imported by FileList.tsx and StatusBar.tsx; `searchQuery` is used in FileList, StatusBar, enter(); tests in explorerReducer.test.ts (`describe('search')`, lines ~142-178), nameSearch.test.ts, FileSearch.test.tsx (222 lines) cover it. The spine's Structural Seed lists none of FileList.tsx, StatusBar.tsx, App.tsx, tests. Also "no immediate folder filtering during debounce" is a behavior change against the project rule "preserve existing behavior" — should be an explicit, owner-approved decision.

### F3 (high) — Adding `Location {type:'search'}` breaks exhaustive assumptions in untracked places
Verified: App.tsx line 29 `location.type === 'folder' ? <FileList/> : <PlacesView mode={location.type}/>` would route a search location to PlacesView; Breadcrumbs.tsx has per-type branches (no search label); Toolbar.tsx `isFolder`, ExplorerProvider `up()` returns early for non-folder, the load effect and folder-expand effect skip non-folder (fine), `refresh` on a search location re-enters but nothing rescans; FileInfo.tsx builds path only for `type==='folder'` (relativePath), so details for a result would show no path unless changed. `enter()` sets status 'idle' for non-folder — OK but spine should say so. None of App/Breadcrumbs/Toolbar/FileInfo appear in the seed.

### F4 (medium) — Name collision: `SearchBox` already exists
`SearchBox` is a local component inside components/FileList.tsx (search-bar markup, class `search-box`). Seed proposes new `components/SearchBox.tsx` "in the address bar". Not wrong, but must be reconciled (remove old one, CSS classes in app.css, tests).

### F5 (medium) — Unconfirmed technical assumptions (no source/date)
- "React 19 automatic batching of dispatches outside event handlers": not stated in the spine; only "dispatch per result [ASSUMPTION]". Batching outside event handlers has been automatic since React 18 and holds in 19 (installed 19.3.1), but per-result dispatch from an async loop still schedules a render per macrotask, not per dispatch across awaits; the assumption should cite batching correctly or batch in the consumer (e.g. flush per animation frame/per directory).
- StrictMode is enabled (main.tsx). AD-3 says SearchProvider aborts on unmount; under StrictMode effects mount/unmount/mount in dev, so any start-on-effect (AD-5 "location of type search without session starts a scan") will fire twice and abort the first — must be idempotent. Not mentioned.
- AsyncGenerator.return() while a next() is pending is queued until that settles — spine's "takes effect at next next()" is correct. Adapter calls are not cancellable (no signal param), so "in-flight folder results discarded" is the only option; accurate.
- File System Access API: spine says only "Browser"; AGENTS.md limits to Chrome/Edge. Not re-verified against current compat data (no web check performed here); permission semantics above come from the code, not docs.
- "Node 20+" comes from AGENTS.md; package.json has no `engines` field, and @types/node is ^24. Unverified against installed Node.
- Performance targets SM-1/SM-2 and 500-cap are product numbers; no measurement exists.

### F6 (low) — Selection model detail
AD-7 keeps `selection` in explorerReducer and ids global, which holds. But `click` needs `orderedIds` from the rendered list; SearchResults must supply them (spine silent). `enter()` clearing selection on navigate means FR-19 "go to location" needs the `select` param plus ensuring the entry loads before `useSelectedEntry` can resolve it (DetailsPane currently finds the entry in `state.entries`, which is empty while status is 'loading').

## What was not verified
No runtime run of `npm run check`, no browser testing, no external docs lookup (React/Chrome compat pages).
