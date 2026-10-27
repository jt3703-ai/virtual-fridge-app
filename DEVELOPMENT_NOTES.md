# Development notes

## What was preserved

The existing project contained one HTML file with embedded CSS, a soft green/cream palette, rounded cards, a two-column fridge/recipe concept, and a missing app.js reference. There was no working inventory or recipe engine. The palette, brand, headline concept, cards and much of the CSS were retained and expanded. CSS was extracted to styles.css; semantic HTML was reorganized to support real forms and dialogs. No framework or replacement project was introduced.

## Decisions and assumptions

- A static application suits the conceptual single-platform beta and a university HTML/CSS assignment. Classic deferred scripts avoid a build step and permit straightforward static hosting.
- Counts are the user-facing model. Explicit edible gram weights reconcile counts with nutrition and recipe requirements. Fractional counts support half an avocado or partial portions.
- Separate batches support different freshness dates; exact duplicate records merge. Matching consumes earliest-date eligible inventory first.
- Unknown names use manual values; no fuzzy matching or automatic invented nutrition. Recognized aliases are exact after case/whitespace normalization.
- Date defaults use conservative selected values with food-specific storage assumptions. Unsupported combinations request manual dates. Date overrides survive later storage/date edits unless the user explicitly recalculates.
- Past-date records remain visible for review but are excluded from recipes. No label says food is safe based on a date.
- A single localStorage record contains inventory, preferences and saved recipe IDs. Initial sample data only appears when there is no saved record. Empty saved inventories remain empty. Malformed saved data is preserved, not replaced with samples.
- Confirmation revalidates stock before creating a new inventory array. A successful action closes the dialog and clears the active recipe to prevent accidental repeated confirmation. Undo is limited to the latest consumption in the current session and invalidated by inventory edits.

## AI-assisted work

The assistant proposed and implemented the Fridgekind name, layout refinements, placeholder meal ideas, reference portions, ranking heuristic, JavaScript organization, and tests. These are design/engineering suggestions rather than user research findings. The user supplied audience, count-based inventory, editable knowledge-based estimates, confirmation-before-deduction, local beta scope, and visual direction. No user interviews, usability studies, or A/B experiments were performed.

## Alternatives considered (not experimentally tested)

- A framework/backend versus plain static files: selected vanilla HTML/CSS/JS to match assignment and beta scope.
- Live AI recipe generation versus curated deterministic matching: selected a finite collection so requirements and deductions are predictable.
- Gram-only input versus count-based units: selected counts plus explicit gram conversion to preserve convenience without inconsistent calculations.
- Silent defaults for unknown foods versus manual entry: selected manual entry to avoid inaccurate automatic knowledge.
- Automatic consumption on opening versus explicit confirmation: selected confirmation as requested.

## Manual refinement opportunities

Independently audit every nutrition row against a pinned USDA FDC record, refine storage assumptions with a food specialist, expand food/recipe coverage, validate realistic preparation times, test screen readers and more mobile devices, replace illustrative external photos with locally licensed images, and reconsider the density of inventory cards with real users. The ranking balance heuristic is intentionally modest and needs review before personalized nutritional recommendations. Cross-tab transactional locking, persistent undo history, backup/export, allergies, and offline asset caching remain future work.

## GitHub preparation

The repository contains source, documentation, a dependency-free test suite and a GitHub Pages workflow. No browser inventory or credentials belong in Git. Existing remote repositories must be inspected before pushing; no force-push or overwrite is part of this workflow. See TEST_RESULTS.md and the delivery message for verified publishing status.
