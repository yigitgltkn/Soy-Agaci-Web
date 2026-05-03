# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A static, single-page Turkish family-tree website ("Çöme Ahmet Soyu", ~660 people as of 2026-05) deployed to Netlify (https://ahmetsoyu.netlify.app) by drag-and-dropping a single `index.html`. There is no package manager, no build system in the modern sense, no tests, no framework — vanilla JS/HTML/CSS. The user-facing language is Turkish.

## The four files that matter and how they relate

```
aile-soyu-*.ods   ──(build_tree.py)──►  people.json  +  data.js  ──(embed)──►  index.html
  (source of truth,                       (long-form,      (compact,            (deployable:
   Mehmet Bey's                            human-           what the             template
   spreadsheet —                           readable —       frontend             with data
   newest dated copy                       inspect this     actually             inlined,
   in this folder wins)                    when             loads)               served by
                                           debugging)                            Netlify)
```

- **Source spreadsheet** — `aile-*.ods` or `aile-*.xlsx` in this directory. Mehmet Bey's hand-curated layout; the visual cell positions ARE the data model (see "Spreadsheet layout convention" below). `build_tree.py` auto-picks the most recently modified one — drop a new dated copy (e.g. `aile-soyu-2026-08-15.ods`) and it just works.
- **`build_tree.py`** — reads ODS or XLSX, parses the layout, writes BOTH `people.json` and `data.js` in one run. Portable (uses `pathlib`, no hardcoded paths).
- **`people.json`** — long-form schema: `name`, `birth`, `death`, `notes`, `parent_ids`, `spouse_ids`, `gender`, plus `_clump_id`/`_row`/`_col` debug fields. Read this when debugging; don't ship it.
- **`data.js`** — what the frontend actually consumes. Compact schema: `name`, `b`, `d`, `n`, `p`, `s`. Wrapped as `window.PEOPLE_DATA = [...]`. Auto-generated; do not hand-edit.
- **`index-template.html`** — the page (markup + CSS + JS) with `<script src="data.js"></script>`. The source you actually edit.
- **`index.html`** — `index-template.html` with that script tag replaced by an inline `<script>window.PEOPLE_DATA = [...]` block. **The only file Netlify serves.** Hand-rebuild with the PowerShell snippet in "Regeneration pipeline" below; never edit this file directly unless you accept that the next regeneration will overwrite you.

Schema mismatch (long-form in `people.json` vs compact in `data.js`) is intentional: long-form for inspection, compact for the wire. The compact writer in `build_tree.py` is the one place that bridges them — change one schema, change the other.

## Regeneration pipeline

End-to-end runnable on Windows (Python 3.10+). One-time setup:

```powershell
python -m pip install openpyxl odfpy
```

Regenerate:

```powershell
cd c:\Users\Yigit\Desktop\Project\come-ahmet-soyu-kit
python build_tree.py
```

This rewrites `people.json` and `data.js` from whichever `aile-*.{ods,xlsx}` is newest in the folder. It prints a sanity report at the end (per-branch person counts, root descendants, daughter-spouse absorption from sep cols) — eyeball this before continuing.

Then re-embed `data.js` into the deployable `index.html`:

```powershell
$dir = 'c:\Users\Yigit\Desktop\Project\come-ahmet-soyu-kit'
$tpl  = [System.IO.File]::ReadAllText("$dir\index-template.html", [System.Text.UTF8Encoding]::new($false))
$data = [System.IO.File]::ReadAllText("$dir\data.js", [System.Text.UTF8Encoding]::new($false))
$out  = $tpl.Replace('<script src="data.js"></script>', "<script>`n$data`n</script>")
[System.IO.File]::WriteAllText("$dir\index.html", $out, [System.Text.UTF8Encoding]::new($false))
```

When in doubt about whether `index.html` is in sync with the source spreadsheet, regenerate. The spreadsheet is authoritative for what's *correct*; `index.html` only reflects what's *currently live*.

## Two editing modes (and their tradeoffs)

The README documents both; both are legitimate but have very different blast radii:

- **Direct edit of `index.html`** (README "Durum 1"): search/replace inside the inlined `window.PEOPLE_DATA` array. Fast, but a stray comma or broken quote breaks the whole site silently because the JS array fails to parse. Always read the surrounding object before editing. Prefer this only for typo-level fixes to existing entries.
- **Excel → regenerate** (README "Durum 2"): the proper path for adding people, restructuring, or anything touching parent/spouse links. The Excel layout encodes the relationships (see below) — get the cell position right and `build_tree.py` does the rest.

## Spreadsheet layout convention (encoded in build_tree.py `BRANCHES`)

Mehmet Bey's spreadsheet is read positionally — *where* a name sits encodes *who they descend from*. The layout was reorganized in the 2026-05 file; the convention now is:

- **5 branches × 5 columns each, with a 1-column SEPARATOR between branches:**
  ```
  İSMAİL    sep   İBRAHİM   sep   HACER     sep   HÜSNİYE   sep   FATMA
  2 3 4 5 6  7   8...12     13   14...18    19   20...24    25   26...30
  ```
  Branch order is not load-bearing — siblings either way (user confirmed).
- Root **(Ahmet–Hatice)** is displayed at `(row 2, col 12)` for visual centering, but the root persons are pre-added programmatically with stable IDs `p_ahmet_root` / `p_hatice_root`. They never come from a clump.
- Branch heads sit at row 5 in the first column of each branch (cols 2, 8, 14, 20, 26).
- A **clump** = a maximal run of consecutive non-empty rows in the same column. **One clump = one family unit.** First row = blood descendant; subsequent rows = spouses (≥3 rows = multiple marriages, e.g. Hasan + Remziye + Habibe).
- Parent assignment: for a clump in column `c` (`c` past the branch's first column), the parent is the **latest clump in column `c-1` whose `first_row ≤ this clump's first_row`**. Branches have internally-consecutive columns, so `c-1` always lands within the same branch — sep cols never break this.
- **Daughter-branch spouse convention** (Hacer, Hüsniye, Fatma — Ahmet's daughters): their husbands are placed in the **LEFT-adjacent (sep) column**, NOT under the daughter in her own column. `build_tree.py` absorbs every non-empty cell from a daughter's sep col into her clump as additional spouse(s) BEFORE the clump builder runs. Without this step, those husbands would either be unparented orphans or treated as their own family unit.
- A cell can hold a couple inline (separated by `–` or by `≥2` spaces between two `Name (...)` blocks); `parse_cell` splits these.
- For a multi-marriage parent, child→spouse is matched by surname (`normalize_match` folds `İ→I`, `Ş→S`, etc.); ambiguous → record only the blood parent.
- Date / note tokens: `(Ş)` / `(ş)` → `Şehit` note. `(ÖT-YYYY)` → death year only. `(YYYY-YYYY)` → birth/death.
- **Cell-level typo fixes** live in `CELL_FIXES` (top of `build_tree.py`). Each entry is `(predicate, replacement)` — keep the list short and document why each fix is correct, since these silently rewrite source data.

If you change branch column ranges, the sep-col convention, or the clump rule, also update `find_parent_clump` and the daughter-absorption step — they're coupled.

## Frontend architecture (inside index-template.html)

Single ~3000-line file. Roughly: top half = CSS + DOM, bottom half (from line ~1573) = the app. No bundler, no modules, everything is globals.

- **State**: one `STATE` object (currentPage, currentPerson, picker selections, tree zoom/pan, `_genYByGen`, `_pulseId`). No reactive framework — `render*` functions imperatively rewrite their section.
- **Startup precomputations** (run once at script load): `BY_ID` (id → person), `CHILDREN_OF` (parent id → child ids), `BRANCH_OF` + `BRANCH_NAMES` (5-color branch attribution via BFS from each direct child of root), `GEN_OF` (generation = BFS distance from root). These avoid recomputing during pan/zoom.
- **Pages** (SPA-style toggled `<section class="page">`): home, person, relationship calculator, tree view, about.
- **URL hash routing**: `#agac`, `#agac/<id>`, `#kisi/<id>`, `#akrabalik`, `#hakkinda`, empty = home. Uses `replaceState` (no history bloat). `applyRoute()` runs once at startup for deep links and on every `hashchange`.
- **Search** (`searchPeople`): scored substring match over a Turkish-folded `normalize()` (lowercases + strips diacritics + maps `ş→s`, `ı→i`, `ğ→g`, etc.). Used by every picker on the site.
- **Relationship calculator**: `ancestorsOf` (BFS up parent edges) → `findCommonAncestor` → `pathToAncestor` → `kinshipName(distA, distB)`. `kinshipName` is a hand-written Turkish kinship table (kardeşi, yeğeni, amcası/dayısı/halası/teyzesi, kuzeni, …) keyed on the (distA, distB) pair to the common ancestor. Natural-language output uses Turkish vowel-harmony helpers (`lastVowel`, `possessiveLink`, `nameGenitive`).
- **Tree view**: custom SVG renderer (no D3). Two modes: `fullTree` (fits canvas by height only — horizontal overflow is intentional, conveys "kalabalık") and centered-on-a-person mode. Pan/zoom is manual (`STATE.treeZoom`, `STATE.treePan`, `applyTransform`). Spouse links drawn dashed at same Y; parent-child links drawn as orthogonal paths only when the child sits exactly one generation below.
- **Tree showcase additions** (Faz 1):
  - **Branch accent stripe** (4px, left edge of each tree node) coloured by `BRANCH_COLORS[BRANCH_OF[id]]`.
  - **Sticky generation axis** (`#gen-axis` overlay, left edge of canvas) — numbered "kuşak" badges that follow the tree vertically as the user pans/zooms. Updated every `applyTransform()` frame; `pointer-events: none` so it never intercepts touch.
  - **Branch legend** (`#branch-legend` overlay, bottom-left) — 5 chips matching node stripe colours; rendered once.
  - **Search-result pulse** — `pulseTreeNode(id)` adds a `pulsing` class + animated halo `<circle>` behind the node when the user lands on it via search (set by `STATE._pulseId` before `renderTree`, fired at the tail). Halo radius animation uses CSS `r` keyframes (Safari < 13.4 degrades to stroke-only pulse, acceptable).

When changing the tree layout or kinship logic, manual browser testing is the only validation — there are no tests. Open `index.html` directly in a browser (no server needed). Most users come from mobile, so always test in a narrow viewport.

## Deployment

Drag the updated `index.html` onto the Netlify dashboard for the `ahmetsoyu` site. The whole site is one file; there is no CI, no preview deploys configured here, no `netlify.toml`. Don't push to a remote — there is no git repo in this directory.
