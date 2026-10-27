# Executed verification

Tested locally in the Codex in-app Chromium browser and with Node 24.19.0. No claim is made that every browser/device or assistive technology was tested.

## Domain regression suite

`node tests.cjs` — **21 passed**. Executed coverage:

- Reference food IDs, nutrition shapes and unit definitions.
- Exact aliases and unknown-food behavior.
- Automatic storage date estimates and unsupported combinations.
- Freshness boundaries, leap day and invalid dates.
- Demo record validation.
- Empty-inventory missing amounts.
- Full recipe availability and correct egg-to-gram conversion.
- Nutrition scaled from weights and divided by recipe servings.
- Customized unit weights and customized nutrient values.
- Partial deductions, zero-quantity removal and original-array immutability.
- Insufficient-stock atomic failure.
- Past-date exclusion.
- Earliest-date allocation across separate batches.
- Changed ranking after changing available foods.
- Diet, calorie and preparation-time filtering.
- JSON roundtrip; manual override acceptance.
- Invalid quantity, future added date and impossible macro validation.

The initial ranking test used two inventories that happened to share the same top recipe. The test fixture was corrected to use an omelette-only ingredient set, then the complete suite passed. No algorithm change was made to force this test outcome.

`node --check dist/app.js` — passed.

## Actual browser workflows

Using isolated localhost inventory to avoid modifying the user's preview:

- Loaded initial demo and rendered summaries, photos and ranked recipe cards.
- Added Milk; verified automatic 244 g cup, 61 kcal/100 g, seven-day refrigerated estimate.
- Changed quantity to two, overrode date to November 5, then changed storage to freezer. Verified manual date stayed November 5.
- Saved, reloaded the page and searched Milk: two cups and the manual date remained.
- Edited Milk to three cups; verified 447 kcal total; removed it and verified search-empty feedback.
- Reviewed Avocado & egg toast: recipe required 56 g bread, 75 g avocado and 50 g egg, with available amounts and user-unit deductions displayed.
- Confirmed consumption: avocado fell from 2 to 1.5 units. Used Undo: it returned to 2.
- Reviewed Chicken & greens rice bowl with no chicken in inventory: confirmation button was disabled.
- Clicked Generate Recipes and verified the recipe view and ranked count.
- Inspected unknown “Custom soup”: manual-entry explanation appeared and no reference values were invented.
- At 390×844 mobile viewport: document width equaled viewport width (390 px, no horizontal overflow); visually inspected navigation, hero, statistics and stacked fridge layout; added/removed Apple through the mobile dialog.
- Checked browser error logs after core workflows: no JavaScript errors recorded.

## Remaining manual QA

Full keyboard-only task completion, screen-reader announcements, Safari/Firefox, multiple mobile hardware devices, offline imagery behavior, corrupted/full storage recovery, rapid concurrent multi-tab edits, and all combinations of saved/filter controls have not received exhaustive browser testing. Engine tests cover validation and conversion paths, but do not substitute for usability testing or food-data verification.
