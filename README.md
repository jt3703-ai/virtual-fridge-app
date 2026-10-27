# Fridgekind — Virtual Fridge & Smart Recipe Selection

A responsive, browser-only application for people living alone and busy professionals. Organize ingredients, notice approaching freshness dates, and choose quick meals based on what you actually have. Built for an HTML/CSS university assignment with vanilla JavaScript; no account, backend, API key, npm install, or build step is required.

## Run

From the project folder:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Keep using the same browser and origin (scheme, hostname and port) to retain your inventory. Opening `dist/index.html` directly also loads the classic scripts, but localStorage behavior on `file:` URLs varies, so HTTP is recommended. Internet access is only needed for optional Google Fonts and illustrative Unsplash photos; the core data and logic are local.

## Features and use

1. First visit starts with clearly fictional demo inventory. Add your own foods with **+**.
2. A recognized name supplies a unit, edible gram weight, nutrition per 100 g, and a storage-specific date estimate. All values are editable. Unknown foods require manual information and do not automatically match curated recipes.
3. Edit quantity, unit weight, storage, dates and nutrition; search or filter inventory. Separate batches are retained when dates or assumptions differ; exact duplicates merge.
4. **Generate Recipes** ranks a fixed collection using actual inventory. Filter by time, calories, diet, readiness, urgency, or high protein (at least 20 g/serving). Save favorite ideas with the heart.
5. Open a recipe to review all quantities, available grams, missing quantities, servings and estimated macros. Opening does not consume ingredients.
6. **Confirm Ingredients Used** revalidates availability and deducts the whole recipe's quantities. Earliest-dated eligible batches are used first; partially used amounts remain; empty batches disappear.
7. **Undo last use** restores the last successful deduction during this session. Any inventory edit or change in another tab invalidates undo so that newer edits cannot be overwritten. Reloading also clears undo.

## Project structure

```text
virtual-fridge-app/
  dist/
    index.html          Semantic page and labeled dialogs
    styles.css          Green/cream design and responsive layouts
    data.js             23 reference foods and 10 curated recipes
    engine.js           Pure dates, units, ranking, nutrition, deduction logic
    app.js              DOM events, state, validation, localStorage
  tests.cjs             Dependency-free domain regression tests
  README.md
  DATA_SOURCES.md        Reference assumptions and source limitations
  DEVELOPMENT_NOTES.md  Assignment reflection and implementation decisions
  TEST_RESULTS.md       Executed checks and remaining QA limits
  .github/workflows/pages.yml
  .gitignore
  .openai/hosting.json   Separate Sites hosting configuration (not used by Pages)
```

`dist` is the authored static website, not generated build output. It can be served from a subdirectory; all application file links are relative. No personal inventory is committed: browser records stay in localStorage under `fridgekind.beta.v1`.

## Architecture and learning guide

**HTML:** `header`, labeled `nav`, one `main`, grouped `section` elements, inventory `aside`, individual `article` cards, and `footer` communicate purpose. A single h1 introduces the dashboard, followed by section headings. Form labels, a nutrition `fieldset`/`legend`, native `dialog` elements, a skip link, visible focus outlines and live feedback support keyboard and assistive technology use. Dialogs provide native modal focus handling and Escape dismissal.

**CSS:** Custom properties define the shared colors. Grid creates the inventory/recipe split, summary tiles, recipe gallery and form groups. Flexbox aligns navigation, card details and actions. Cream backgrounds, dark green actions and pale green surfaces establish hierarchy; amber and muted red identify date urgency without relying solely on color. Rounded borders and subtle hover movement preserve the original design. At 950 px the recipe grid simplifies; at 700 px the dashboard stacks; at 420 px cards use one column. Inputs and dialogs remain constrained to the viewport. Reduced-motion preferences remove transitions. System font fallbacks work without Google Fonts.

**JavaScript:** Deferred classic scripts run in dependency order: data → pure engine → UI controller. `FridgeData` and `FridgeEngine` are small explicit namespaces, also exported for Node tests. UI events update one state record and rerender relevant regions. Rendering escapes user-entered text. The engine has no browser dependency and can later accept normalized USDA data without rewriting the interface.

**Quantities:** An inventory record has a unit count, grams per unit, and nutrients per 100 g. Recipe requirements use fixed reference weights (`recipe units × reference grams`). Available grams are `user units × user grams per unit`. Matching and deduction operate in grams, then convert back to the user's unit count. Changing a personal unit does not change a recipe's required weight. Nutrition uses actual allocated batch nutrients and reference values only for missing amounts; totals divide by the fixed recipe serving count.

**Ranking:** Coverage contributes up to 65 points, full availability 15, use-soon allocations 10, speed 5, and a basic macro/produce heuristic 5. The latter checks protein energy share ≥15%, fat energy share ≤40%, and at least one fruit/vegetable; it is a simple design heuristic, not personalized dietary advice. Coverage percentages are the average fraction available across ingredient lines, not a clinical suitability score. Recipes with missing ingredients remain visible with explicit quantities.

## Testing

With Node.js installed:

```sh
node tests.cjs
node --check dist/app.js
```

No development dependencies are required. See TEST_RESULTS.md for the actual executed browser workflows and domain checks; these scripts do not automate browser interaction.

## GitHub submission and GitHub Pages

This project is compatible with GitHub Pages. The included Actions workflow uploads only `dist/`, runs the domain tests, and deploys the static files. It does not require Sites configuration.

Before pushing, authenticate using `gh auth login`, then inspect the intended destination:

```sh
gh repo view YOUR_USERNAME/virtual-fridge-app
```

If it exists, inspect it and obtain approval before using it. If GitHub explicitly confirms it does not exist, create a new repository; do not interpret an authentication or network error as proof of absence.

```sh
gh repo create virtual-fridge-app --public --source=. --remote=github --push
```

A public repository is suitable for a public instructor-facing Pages site; choose privacy intentionally. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**, then run the **Deploy Fridgekind to GitHub Pages** workflow. The resulting URL is shown by the deployment job. A typical project URL is `https://YOUR_USERNAME.github.io/virtual-fridge-app/`; it is not live until deployment succeeds. Never force-push over an existing repository.

## Limits

This beta uses rounded reference estimates, not a live nutrition service or measured freshness. Some storage/food combinations deliberately offer no date prediction. Always review labels and actual history; an estimated date cannot establish safety. Past-date items are excluded until their details are reviewed and updated. A new storage choice estimates from the entered start date; it cannot reconstruct prior handling. Unknown foods can be tracked but will not join recipe matches until a reference and recipe are explicitly added.

No allergy filtering, personalized diet plans, account/cloud sync, barcode scanning, serving-size selector, or step-by-step cooking instructions are included. Prep times are approximate active preparation targets and omit thawing, shopping and advance chilling. Illustrative images do not guarantee the pictured dish is identical. localStorage is origin-specific and can be cleared by browser settings. Multi-tab updates are last-write-wins; atomic cross-tab transactions are outside this beta. Storage failures are shown rather than silently claiming persistence. Corrupt saved data is preserved and the session enters temporary mode.

## Things to experiment with

Change `--green`, `--bg` and `--line` in styles.css; adjust Grid column proportions, spacing, card radii and breakpoints; replace photos with your own licensed images; expand reference foods and aliases in data.js; add complete recipe ingredient definitions; tune documented ranking weights in engine.js and add tests for changed behavior.
