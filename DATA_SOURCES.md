# Food and recipe references

## Nutrition

The compact `foods` table in `dist/data.js` contains rounded reference values per 100 g edible food, following common USDA SR Legacy / FoodData Central food descriptions. These are a manually assembled educational seed dataset, not a downloaded or independently audited FDC extract. No exact per-row FDC record IDs or release guarantees are asserted. Values vary with brand, variety, preparation and draining. Before production use, match each row to a pinned authoritative record and store its ID, data type, retrieval date and food state.

Primary reference and future integration entry point: [USDA FoodData Central](https://fdc.nal.usda.gov/). The table records kcal, protein, carbohydrate and fat in that order. Approximate portion weights are separate UX assumptions. Nutrition editing changes per-100-g values; the interface also previews per-unit calories. Explicit raw/cooked states prevent treating raw rice like cooked rice or raw chicken like cooked chicken. Aliases such as “rice” deliberately map to the displayed cooked reference; users must review the match and portion.

## Storage

References consulted:

- [Nebraska Extension: Home Food Storage](https://food.unl.edu/free-resource/food-storage/)
- [FoodSafety.gov: Cold Food Storage Chart](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts)
- [USDA: Shell Eggs from Farm to Table](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/eggs/shell-eggs-farm-table)

Days are deliberately selected defaults, not predictions based on sensors or a safety certification. Typical values include 21 refrigerated days for raw eggs in shell (lower end of 3–5 weeks), 1 day for raw chicken (lower end of 1–2), 2 days for opened greens, 3 for broccoli, 7 for milk, and 3 for refrigerated cooked rice. Opened canned foods use a short refrigerated window. Dry pasta, oats and opened oil use conservative educational pantry defaults; these are model assumptions, not exact product-specific expiration claims. The row's `assumption` text appears in the form. Freezer values represent quality windows and require suitable food preparation; unsupported states offer no automatic date.

The date added field means the start of the assumed storage state, or opening for an opened package. Food may already be old when purchased. Changing from fridge to freezer does not reset prior deterioration. Users should use labels and actual storage history and can override all dates. Past-date foods are not matched to recipes unless their saved information is reviewed and updated. An item inside its estimated window is never declared safe.

## Recipes and imagery

Ten meal concepts and quantities are curated educational examples created with AI assistance. Nutrient totals are calculated, not stored as independent hard-coded recipe claims. The recipes have fixed serving counts; the pasta makes two servings and consumes the whole listed recipe. They are selection ideas, not validated cooking tutorials. Time estimates omit shopping/thawing and advance chilling. No salt, oil or other pantry ingredient is silently assumed.

Illustrative photos are requested from `images.unsplash.com`; URLs are in data.js and index.html. They may depict a related rather than identical dish. No images were downloaded or bundled. Availability of photos and Google Fonts requires internet access. Browser system fonts and colored card backgrounds are fallbacks. Replace with owned or appropriately licensed local photos for a fully self-contained submission.

The redesigned food library and fridge use 24 locally authored SVG illustrations in `dist/assets/foods/`. These are stylized geometric drawings and do not depend on fonts or external image services. The external-image notes above apply only to recipe photographs.

Current visual revision: all recipe photography has been replaced by ten locally authored flat SVG meal illustrations in `dist/assets/recipes/`. Recipe data uses only these local paths. The fridge uses CSS geometry to draw the open appliance; no external artwork or image-generation service is involved. Earlier photo notes describe a previous revision.
