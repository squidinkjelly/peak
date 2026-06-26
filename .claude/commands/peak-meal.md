# /peak-meal

Add a new meal to the Peak nutrition tracking app seed file.

## What this skill does

Guides you through adding a correctly formatted meal to `backend/src/routes/seed.js` — matching the exact structure the app expects, with all ingredients and nutrition values filled in. No fields left blank, no AI-generated nutrition values.

## Critical rules

- **NO AI-generated nutrition values.** All calories, protein, carbs, and fat must come from real sources (nutrition labels, USDA database, Cronometer, etc.). If you don't have a value, say so and look it up before proceeding.
- Nutrition values are **per ingredient at the stated quantity**, not per 100g.
- `calories` on each ingredient = total kcal for that quantity (e.g. 180g chicken breast = 297 kcal, not 165 kcal/100g).
- Every ingredient mentioned in `recipe_text` must appear in the `ingredients` array.
- `default_servings` reflects how many people the recipe makes (e.g. 2 for a batch recipe).

## Seed file location

`backend/src/routes/seed.js` — append the new recipe object inside the `RECIPES` array.

## Recipe object format

```js
{
  name: 'Meal Name Here',
  category: 'breakfast', // breakfast | lunch | dinner | snack | dessert
  default_servings: 1,
  notes: 'One-line cooking tip or context.',
  source_url: '',
  recipe_text: `Ingredient list\n\nStep-by-step method`,
  ingredients: [
    { name: 'Ingredient name', quantity: 150, unit: 'g',    calories: 247, protein_g: 31, carbs_g: 0,  fat_g: 13 },
    { name: 'Another item',    quantity: 30,  unit: 'ml',   calories: 18,  protein_g: 2,  carbs_g: 2,  fat_g: 0  },
    { name: 'Eggs',            quantity: 2,   unit: 'large', calories: 140, protein_g: 12, carbs_g: 1,  fat_g: 10 },
  ],
},
```

## Valid units

`g`, `ml`, `large`, `cup`, `tbsp`, `tsp`, `slice` — use whichever is most natural for the ingredient.

## Step-by-step process

When `/peak-meal` is invoked:

1. **Ask for the meal name and category** if not already provided.

2. **Ask for the recipe** — either paste the full recipe text, or describe the ingredients and method. Convert whatever the user provides into the `recipe_text` format (ingredient list first, then numbered steps).

3. **List every ingredient** found in the recipe and ask the user to confirm quantities and nutrition values for each one. Present them as a table:

   | Ingredient | Qty | Unit | kcal | Protein | Carbs | Fat |
   |---|---|---|---|---|---|---|
   | Chicken breast | 180 | g | ? | ? | ? | ? |

   If the user doesn't know a value, remind them to look it up (MyFitnessPal, Cronometer, USDA FoodData Central) — do not fill in estimated values.

4. **Once all values are confirmed**, write the complete recipe object and insert it into `RECIPES` array in `backend/src/routes/seed.js`.

5. **Remind the user** to:
   - Restart the backend: `pkill -f "node src/index.js"` then `cd backend && node src/index.js &`
   - Click the **Tester** button in the app to re-seed with the new meal included

## Example invocations

```
/peak-meal
/peak-meal Overnight Oats
/peak-meal add a high-protein pasta dinner
```

## What good output looks like

After collecting all information, produce a clean JS object ready to paste — no placeholders, no `TODO`, no `?` values. Every ingredient in the recipe text has a matching entry in the ingredients array with real nutrition numbers the user has verified.
