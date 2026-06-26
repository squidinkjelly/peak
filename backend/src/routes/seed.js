const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { db, UPLOADS_DIR } = require('../db/schema');
const router = express.Router();

// TheMealDB search terms — mapped to actual meal names that exist in the DB
const PHOTO_SEARCHES = {
  'Grilled Chicken Rice Bowl':        'chicken congee',
  'Tuna & Chickpea Salad Wrap':       'tuna nicoise',
  'Turkey Quinoa Power Bowl':         'turkey meatball soup',
  'Smoked Salmon Bagel':              'smoked salmon fettuccine',
  'Beef & Broccoli Stir-Fry':        'beef and broccoli',
  'Baked Cod with Sweet Potato':      'baked salmon with fennel',
  'Chicken Tikka Masala':             'chicken tikka masala',
  'Greek Lamb Chops with Tzatziki':   'lamb chops',
  'Greek Yogurt Protein Parfait':     'summer pudding',
  'Cottage Cheese & Pineapple':       'pineapple upside down cake',
  'Hard Boiled Eggs with Hummus':     'shakshuka',
  'Protein Banana Smoothie':          'banana pancakes',
  'Chocolate Protein Mousse':         'chocolate mousse',
  'Vanilla Protein Mug Cake':         'vanilla cream brûlée',
  'Ricotta Berry Bowl':               'summer berry pudding',
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client.get(url, (res) => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function fetchPhotoForMeal(mealName) {
  const term = PHOTO_SEARCHES[mealName] || mealName.split(' ')[0].toLowerCase();
  try {
    const data = await fetchJson(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`
    );
    const meal = data.meals?.[0];
    if (!meal?.strMealThumb) return { filename: null, sourceUrl: null };
    const filename = `seed-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const dest = path.join(UPLOADS_DIR, filename);
    await downloadFile(meal.strMealThumb, dest);
    return { filename, sourceUrl: meal.strSource || null };
  } catch (e) {
    return { filename: null, sourceUrl: null };
  }
}

const RECIPES = [
  // ── Breakfasts ────────────────────────────────────────────────────────
  {
    name: 'Smoked Salmon Bagel',
    category: 'breakfast',
    default_servings: 1,
    notes: 'Quick high-protein breakfast.',
    source_url: '',
    recipe_text: '1 whole wheat bagel\n90g smoked salmon\n2 tbsp cream cheese\nRed onion, capers, dill\n\nToast bagel. Spread cream cheese. Layer salmon, onion and capers.',
    ingredients: [
      { name: 'Whole wheat bagel', quantity: 105, unit: 'g',  calories: 270, protein_g: 11, carbs_g: 52, fat_g: 2  },
      { name: 'Smoked salmon',     quantity: 90,  unit: 'g',  calories: 117, protein_g: 18, carbs_g: 0,  fat_g: 5  },
      { name: 'Cream cheese',      quantity: 30,  unit: 'g',  calories: 99,  protein_g: 2,  carbs_g: 1,  fat_g: 10 },
      { name: 'Red onion',         quantity: 20,  unit: 'g',  calories: 8,   protein_g: 0,  carbs_g: 2,  fat_g: 0  },
      { name: 'Capers',            quantity: 10,  unit: 'g',  calories: 2,   protein_g: 0,  carbs_g: 0,  fat_g: 0  },
    ],
  },
  {
    name: 'Greek Yogurt Protein Parfait',
    category: 'breakfast',
    default_servings: 1,
    notes: 'Great post-workout breakfast.',
    source_url: '',
    recipe_text: '200g Greek yogurt (full fat)\n30g granola\n80g mixed berries\n1 tsp honey\n\nLayer yogurt, granola, berries. Drizzle honey.',
    ingredients: [
      { name: 'Greek yogurt (full fat)', quantity: 200, unit: 'g', calories: 198, protein_g: 20, carbs_g: 8,  fat_g: 10 },
      { name: 'Granola',                 quantity: 30,  unit: 'g', calories: 140, protein_g: 3,  carbs_g: 22, fat_g: 5  },
      { name: 'Mixed berries',           quantity: 80,  unit: 'g', calories: 38,  protein_g: 1,  carbs_g: 9,  fat_g: 0  },
      { name: 'Honey',                   quantity: 7,   unit: 'g', calories: 21,  protein_g: 0,  carbs_g: 6,  fat_g: 0  },
    ],
  },
  {
    name: 'Protein Banana Smoothie',
    category: 'breakfast',
    default_servings: 1,
    notes: 'Blend everything from frozen for best texture.',
    source_url: '',
    recipe_text: '1 banana (frozen)\n30g vanilla whey protein\n250ml whole milk\n1 tbsp almond butter\nHandful of ice\n\nBlend until smooth.',
    ingredients: [
      { name: 'Banana',              quantity: 120, unit: 'g',  calories: 107, protein_g: 1,  carbs_g: 27, fat_g: 0  },
      { name: 'Vanilla whey protein', quantity: 30, unit: 'g',  calories: 120, protein_g: 24, carbs_g: 3,  fat_g: 2  },
      { name: 'Whole milk',          quantity: 250, unit: 'ml', calories: 162, protein_g: 8,  carbs_g: 12, fat_g: 9  },
      { name: 'Almond butter',       quantity: 15,  unit: 'g',  calories: 88,  protein_g: 3,  carbs_g: 3,  fat_g: 8  },
    ],
  },
  // ── Lunches ───────────────────────────────────────────────────────────
  {
    name: 'Grilled Chicken Rice Bowl',
    category: 'lunch',
    default_servings: 1,
    notes: 'High-protein weekday staple.',
    source_url: '',
    recipe_text: '180g chicken breast, grilled\n1 cup cooked white rice\n½ avocado\n2 tbsp soy sauce\nSesame seeds to garnish\n\n1. Season chicken with salt, pepper, garlic powder. Grill 6 min each side.\n2. Slice and serve over rice. Top with avocado and soy sauce.',
    ingredients: [
      { name: 'Chicken breast',      quantity: 180, unit: 'g',  calories: 297, protein_g: 56, carbs_g: 0,  fat_g: 6  },
      { name: 'White rice (cooked)', quantity: 185, unit: 'g',  calories: 240, protein_g: 4,  carbs_g: 53, fat_g: 0  },
      { name: 'Avocado',             quantity: 75,  unit: 'g',  calories: 120, protein_g: 1,  carbs_g: 6,  fat_g: 11 },
      { name: 'Soy sauce',           quantity: 30,  unit: 'ml', calories: 18,  protein_g: 2,  carbs_g: 2,  fat_g: 0  },
      { name: 'Sesame seeds',        quantity: 5,   unit: 'g',  calories: 29,  protein_g: 1,  carbs_g: 1,  fat_g: 2  },
    ],
  },
  {
    name: 'Tuna & Chickpea Salad Wrap',
    category: 'lunch',
    default_servings: 1,
    notes: 'Ready in 5 minutes.',
    source_url: '',
    recipe_text: '1 can tuna in water (drained)\n½ can chickpeas\n2 tbsp Greek yogurt\nLemon juice, salt, pepper\n1 large wholegrain wrap\n\nMix tuna, chickpeas, yogurt and lemon. Season. Fill wrap.',
    ingredients: [
      { name: 'Canned tuna',    quantity: 140, unit: 'g',  calories: 140, protein_g: 30, carbs_g: 0,  fat_g: 1  },
      { name: 'Chickpeas',      quantity: 100, unit: 'g',  calories: 164, protein_g: 9,  carbs_g: 27, fat_g: 3  },
      { name: 'Greek yogurt',   quantity: 40,  unit: 'g',  calories: 40,  protein_g: 4,  carbs_g: 2,  fat_g: 0  },
      { name: 'Wholegrain wrap', quantity: 60, unit: 'g',  calories: 160, protein_g: 5,  carbs_g: 28, fat_g: 3  },
      { name: 'Lemon juice',    quantity: 15,  unit: 'ml', calories: 4,   protein_g: 0,  carbs_g: 1,  fat_g: 0  },
    ],
  },
  {
    name: 'Turkey Quinoa Power Bowl',
    category: 'lunch',
    default_servings: 1,
    notes: 'Meal-prep friendly — makes 4 portions.',
    source_url: '',
    recipe_text: '200g ground turkey\n1 cup cooked quinoa\n1 cup baby spinach\n½ red bell pepper\n2 tbsp balsamic glaze\nGarlic, paprika\n\n1. Brown turkey in a pan with garlic and paprika.\n2. Toss with quinoa, spinach, and pepper. Drizzle with balsamic.',
    ingredients: [
      { name: 'Ground turkey',   quantity: 200, unit: 'g',  calories: 220, protein_g: 44, carbs_g: 0,  fat_g: 4  },
      { name: 'Quinoa (cooked)', quantity: 185, unit: 'g',  calories: 222, protein_g: 8,  carbs_g: 39, fat_g: 4  },
      { name: 'Baby spinach',    quantity: 30,  unit: 'g',  calories: 7,   protein_g: 1,  carbs_g: 1,  fat_g: 0  },
      { name: 'Red bell pepper', quantity: 60,  unit: 'g',  calories: 19,  protein_g: 1,  carbs_g: 4,  fat_g: 0  },
      { name: 'Balsamic glaze',  quantity: 20,  unit: 'ml', calories: 40,  protein_g: 0,  carbs_g: 10, fat_g: 0  },
      { name: 'Garlic',          quantity: 6,   unit: 'g',  calories: 9,   protein_g: 0,  carbs_g: 2,  fat_g: 0  },
    ],
  },
  // ── Dinners ───────────────────────────────────────────────────────────
  {
    name: 'Beef & Broccoli Stir-Fry',
    category: 'dinner',
    default_servings: 1,
    notes: 'Serve over jasmine rice.',
    source_url: '',
    recipe_text: '220g sirloin steak, thinly sliced\n2 cups broccoli florets\n3 tbsp soy sauce\n1 tbsp oyster sauce\n1 tsp sesame oil\nGarlic, ginger\n\n1. Sear beef in hot wok 2 min. Set aside.\n2. Stir-fry broccoli with garlic and ginger 3 min.\n3. Add beef back. Sauce. Toss 1 min.',
    ingredients: [
      { name: 'Sirloin steak', quantity: 220, unit: 'g',  calories: 341, protein_g: 52, carbs_g: 0,  fat_g: 14 },
      { name: 'Broccoli',      quantity: 160, unit: 'g',  calories: 54,  protein_g: 4,  carbs_g: 10, fat_g: 1  },
      { name: 'Soy sauce',     quantity: 45,  unit: 'ml', calories: 27,  protein_g: 3,  carbs_g: 3,  fat_g: 0  },
      { name: 'Oyster sauce',  quantity: 15,  unit: 'ml', calories: 18,  protein_g: 0,  carbs_g: 3,  fat_g: 0  },
      { name: 'Sesame oil',    quantity: 5,   unit: 'ml', calories: 45,  protein_g: 0,  carbs_g: 0,  fat_g: 5  },
      { name: 'Garlic & ginger', quantity: 10, unit: 'g', calories: 10,  protein_g: 0,  carbs_g: 2,  fat_g: 0  },
    ],
  },
  {
    name: 'Baked Cod with Sweet Potato',
    category: 'dinner',
    default_servings: 1,
    notes: 'Light but filling.',
    source_url: '',
    recipe_text: '200g cod fillet\n1 medium sweet potato\nOlive oil, lemon, paprika, garlic\n\n1. Roast sweet potato at 200°C for 40 min.\n2. Season cod. Bake 15 min at 200°C.\n3. Serve with lemon wedge and greens.',
    ingredients: [
      { name: 'Cod fillet',   quantity: 200, unit: 'g',  calories: 182, protein_g: 40, carbs_g: 0,  fat_g: 2  },
      { name: 'Sweet potato', quantity: 150, unit: 'g',  calories: 129, protein_g: 2,  carbs_g: 30, fat_g: 0  },
      { name: 'Olive oil',    quantity: 10,  unit: 'ml', calories: 88,  protein_g: 0,  carbs_g: 0,  fat_g: 10 },
      { name: 'Lemon',        quantity: 30,  unit: 'g',  calories: 9,   protein_g: 0,  carbs_g: 3,  fat_g: 0  },
      { name: 'Paprika',      quantity: 2,   unit: 'g',  calories: 6,   protein_g: 0,  carbs_g: 1,  fat_g: 0  },
      { name: 'Garlic',       quantity: 6,   unit: 'g',  calories: 9,   protein_g: 0,  carbs_g: 2,  fat_g: 0  },
    ],
  },
  {
    name: 'Chicken Tikka Masala',
    category: 'dinner',
    default_servings: 2,
    notes: 'Serve with basmati rice or naan.',
    source_url: '',
    recipe_text: '400g chicken thighs\n400ml passata\n150ml coconut cream\n1 onion\n2 tbsp tikka masala paste\nGarlic, ginger\n\n1. Brown chicken pieces. Add onion, garlic, paste.\n2. Add passata and coconut cream. Simmer 25 min.',
    ingredients: [
      { name: 'Chicken thighs',     quantity: 400, unit: 'g',  calories: 560, protein_g: 72, carbs_g: 0,  fat_g: 28 },
      { name: 'Passata',            quantity: 400, unit: 'g',  calories: 104, protein_g: 4,  carbs_g: 20, fat_g: 0  },
      { name: 'Coconut cream',      quantity: 150, unit: 'ml', calories: 330, protein_g: 3,  carbs_g: 6,  fat_g: 34 },
      { name: 'Tikka masala paste', quantity: 30,  unit: 'g',  calories: 60,  protein_g: 1,  carbs_g: 5,  fat_g: 4  },
      { name: 'Onion',              quantity: 110, unit: 'g',  calories: 45,  protein_g: 1,  carbs_g: 11, fat_g: 0  },
      { name: 'Garlic & ginger',    quantity: 15,  unit: 'g',  calories: 15,  protein_g: 0,  carbs_g: 3,  fat_g: 0  },
    ],
  },
  {
    name: 'Greek Lamb Chops with Tzatziki',
    category: 'dinner',
    default_servings: 1,
    notes: 'Marinate overnight for best flavour.',
    source_url: '',
    recipe_text: '3 lamb loin chops\nOlive oil, lemon, oregano, garlic\n½ cup Greek yogurt (tzatziki base)\n½ cucumber, grated\n\n1. Marinate chops 1 hr. Grill or pan-sear 3 min per side.\n2. Mix yogurt, cucumber, garlic for tzatziki.',
    ingredients: [
      { name: 'Lamb loin chops', quantity: 240, unit: 'g',  calories: 480, protein_g: 52, carbs_g: 0,  fat_g: 30 },
      { name: 'Greek yogurt',    quantity: 120, unit: 'g',  calories: 120, protein_g: 12, carbs_g: 6,  fat_g: 3  },
      { name: 'Cucumber',        quantity: 60,  unit: 'g',  calories: 8,   protein_g: 0,  carbs_g: 2,  fat_g: 0  },
      { name: 'Olive oil',       quantity: 15,  unit: 'ml', calories: 133, protein_g: 0,  carbs_g: 0,  fat_g: 15 },
      { name: 'Lemon',           quantity: 30,  unit: 'g',  calories: 9,   protein_g: 0,  carbs_g: 3,  fat_g: 0  },
      { name: 'Garlic',          quantity: 6,   unit: 'g',  calories: 9,   protein_g: 0,  carbs_g: 2,  fat_g: 0  },
    ],
  },
  // ── Snacks ────────────────────────────────────────────────────────────
  {
    name: 'Cottage Cheese & Pineapple',
    category: 'snack',
    default_servings: 1,
    notes: 'Simple, high casein protein snack.',
    source_url: '',
    recipe_text: '200g low-fat cottage cheese\n80g pineapple chunks\nPinch of cinnamon\n\nCombine in a bowl. Dust with cinnamon.',
    ingredients: [
      { name: 'Cottage cheese (low fat)', quantity: 200, unit: 'g', calories: 163, protein_g: 28, carbs_g: 6,  fat_g: 2  },
      { name: 'Pineapple',               quantity: 80,  unit: 'g', calories: 41,  protein_g: 0,  carbs_g: 11, fat_g: 0  },
      { name: 'Cinnamon',                quantity: 1,   unit: 'g', calories: 2,   protein_g: 0,  carbs_g: 1,  fat_g: 0  },
    ],
  },
  {
    name: 'Hard Boiled Eggs with Hummus',
    category: 'snack',
    default_servings: 1,
    notes: '3 eggs + hummus for dipping.',
    source_url: '',
    recipe_text: '3 large eggs\n60g hummus\nPaprika to serve\n\nBoil eggs 10 min. Cool and peel. Serve with hummus.',
    ingredients: [
      { name: 'Eggs',    quantity: 3,  unit: 'large', calories: 210, protein_g: 18, carbs_g: 1,  fat_g: 14 },
      { name: 'Hummus',  quantity: 60, unit: 'g',     calories: 138, protein_g: 5,  carbs_g: 10, fat_g: 9  },
      { name: 'Paprika', quantity: 1,  unit: 'g',     calories: 3,   protein_g: 0,  carbs_g: 1,  fat_g: 0  },
    ],
  },
  // ── Desserts ──────────────────────────────────────────────────────────
  {
    name: 'Chocolate Protein Mousse',
    category: 'dessert',
    default_servings: 2,
    notes: 'Chill 1 hour before serving.',
    source_url: '',
    recipe_text: '200g silken tofu\n30g chocolate whey protein\n2 tbsp cocoa powder\n2 tbsp maple syrup\n1 tsp vanilla extract\n\nBlend all until silky smooth. Divide into glasses. Chill.',
    ingredients: [
      { name: 'Silken tofu',            quantity: 200, unit: 'g',  calories: 100, protein_g: 10, carbs_g: 4,  fat_g: 4  },
      { name: 'Chocolate whey protein', quantity: 30,  unit: 'g',  calories: 118, protein_g: 23, carbs_g: 4,  fat_g: 2  },
      { name: 'Cocoa powder',           quantity: 14,  unit: 'g',  calories: 33,  protein_g: 2,  carbs_g: 6,  fat_g: 1  },
      { name: 'Maple syrup',            quantity: 30,  unit: 'ml', calories: 79,  protein_g: 0,  carbs_g: 20, fat_g: 0  },
      { name: 'Vanilla extract',        quantity: 5,   unit: 'ml', calories: 12,  protein_g: 0,  carbs_g: 1,  fat_g: 0  },
    ],
  },
  {
    name: 'Vanilla Protein Mug Cake',
    category: 'dessert',
    default_servings: 1,
    notes: 'Microwave 90 seconds. Eat immediately.',
    source_url: '',
    recipe_text: '30g vanilla whey protein\n2 tbsp oat flour\n1 egg\n3 tbsp milk\n½ tsp baking powder\nGreek yogurt to top\n\nMix in a mug. Microwave 90 sec on high. Top with yogurt.',
    ingredients: [
      { name: 'Vanilla whey protein', quantity: 30, unit: 'g',    calories: 120, protein_g: 24, carbs_g: 3,  fat_g: 2  },
      { name: 'Oat flour',            quantity: 20, unit: 'g',    calories: 75,  protein_g: 3,  carbs_g: 13, fat_g: 1  },
      { name: 'Egg',                  quantity: 1,  unit: 'large', calories: 70, protein_g: 6,  carbs_g: 0,  fat_g: 5  },
      { name: 'Milk',                 quantity: 45, unit: 'ml',   calories: 28,  protein_g: 1,  carbs_g: 2,  fat_g: 1  },
      { name: 'Greek yogurt (topping)', quantity: 50, unit: 'g',  calories: 50,  protein_g: 5,  carbs_g: 2,  fat_g: 1  },
    ],
  },
  {
    name: 'Ricotta Berry Bowl',
    category: 'dessert',
    default_servings: 1,
    notes: 'Elegant dessert with minimal effort.',
    source_url: '',
    recipe_text: '200g ricotta\n100g mixed berries\n1 tbsp honey\nLemon zest\nCrumbled pistachios\n\nSpoon ricotta into bowl. Top with berries, honey, zest and pistachios.',
    ingredients: [
      { name: 'Ricotta',       quantity: 200, unit: 'g', calories: 260, protein_g: 18, carbs_g: 6,  fat_g: 18 },
      { name: 'Mixed berries', quantity: 100, unit: 'g', calories: 47,  protein_g: 1,  carbs_g: 11, fat_g: 0  },
      { name: 'Honey',         quantity: 15,  unit: 'g', calories: 46,  protein_g: 0,  carbs_g: 12, fat_g: 0  },
      { name: 'Pistachios',    quantity: 15,  unit: 'g', calories: 87,  protein_g: 3,  carbs_g: 4,  fat_g: 7  },
    ],
  },
];

router.post('/', async (req, res) => {
  // Wipe any previously seeded data so repeated clicks stay idempotent
  const seedNames = RECIPES.map(r => r.name);
  const placeholders = seedNames.map(() => '?').join(',');
  const existingIds = db.prepare(`SELECT id FROM meals WHERE name IN (${placeholders})`).all(...seedNames).map(r => r.id);
  if (existingIds.length) {
    const idPlaceholders = existingIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM meal_logs WHERE meal_id IN (${idPlaceholders})`).run(...existingIds);
    db.prepare(`DELETE FROM plan_slots WHERE meal_id IN (${idPlaceholders})`).run(...existingIds);
    db.prepare(`DELETE FROM meals WHERE id IN (${idPlaceholders})`).run(...existingIds);
  }

  const insertMeal = db.prepare(
    'INSERT INTO meals (name, default_servings, notes, source_url, recipe_text, photo_path) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertIng = db.prepare(
    'INSERT INTO ingredients (meal_id, name, quantity, unit, calories, protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const updatePhoto     = db.prepare('UPDATE meals SET photo_path = ? WHERE id = ?');
  const updateSourceUrl = db.prepare('UPDATE meals SET source_url = ? WHERE id = ? AND (source_url IS NULL OR source_url = \'\')');


  const updateCategory = db.prepare('UPDATE meals SET category = ? WHERE id = ?');

  // Insert all meals + ingredients synchronously
  const insertedIds = db.transaction(() => {
    return RECIPES.map(r => {
      const result = insertMeal.run(r.name, r.default_servings, r.notes, r.source_url, r.recipe_text, null);
      const mealId = result.lastInsertRowid;
      for (const ing of r.ingredients) {
        insertIng.run(mealId, ing.name, ing.quantity, ing.unit, ing.calories, ing.protein_g, ing.carbs_g, ing.fat_g);
      }
      return { id: mealId, name: r.name, category: r.category };
    });
  })();

  // Set categories and download photos async (best-effort)
  const photoResults = await Promise.allSettled(
    insertedIds.map(async ({ id, name, category }) => {
      updateCategory.run(category, id);
      const { filename, sourceUrl } = await fetchPhotoForMeal(name);
      if (filename)   updatePhoto.run(filename, id);
      if (sourceUrl)  updateSourceUrl.run(sourceUrl, id);
      return { id, name, photo: filename };
    })
  );

  const photosLoaded = photoResults.filter(r => r.status === 'fulfilled' && r.value.photo).length;

  // ── Pre-fill Monday's sample meal plan for the current week ──────────
  try {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
    const weekStart = monday.toISOString().slice(0, 10);

    // Upsert the weekly plan
    let plan = db.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?').get(weekStart);
    if (!plan) {
      const r = db.prepare('INSERT INTO weekly_plans (week_start_date) VALUES (?)').run(weekStart);
      plan = db.prepare('SELECT * FROM weekly_plans WHERE id = ?').get(r.lastInsertRowid);
    }

    // Find first meal in each category (use the freshly inserted IDs)
    const byCategory = {};
    for (const { id, name } of insertedIds) {
      const recipe = RECIPES.find(r => r.name === name);
      if (recipe && !byCategory[recipe.category]) byCategory[recipe.category] = id;
    }

    // Clear any existing Monday slots and add sample breakfast, lunch, dinner
    const sampleSlots = [
      byCategory['breakfast'] && { meal_id: byCategory['breakfast'], day_of_week: 0, meal_type: 'breakfast' },
      byCategory['lunch']     && { meal_id: byCategory['lunch'],     day_of_week: 0, meal_type: 'lunch' },
      byCategory['dinner']    && { meal_id: byCategory['dinner'],    day_of_week: 0, meal_type: 'dinner' },
    ].filter(Boolean);

    db.prepare('DELETE FROM plan_slots WHERE weekly_plan_id = ? AND day_of_week = 0').run(plan.id);
    const insertSlot = db.prepare(
      'INSERT INTO plan_slots (weekly_plan_id, meal_id, day_of_week, meal_type, servings) VALUES (?, ?, ?, ?, 1)'
    );
    for (const s of sampleSlots) insertSlot.run(plan.id, s.meal_id, s.day_of_week, s.meal_type);
  } catch (_) {}

  // ── Seed sample meal logs for today (3 meals) ───────────────────────
  try {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    // Use local time directly (not toISOString which converts to UTC)
    const makeTs = (h, m) => {
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(h)}:${pad(m)}:00`;
    };

    const byCategory = {};
    for (const { id, name } of insertedIds) {
      const recipe = RECIPES.find(r => r.name === name);
      if (recipe && !byCategory[recipe.category]) byCategory[recipe.category] = id;
    }

    const sampleLogs = [
      byCategory['breakfast'] && { meal_id: byCategory['breakfast'], meal_type: 'breakfast', eaten_at: makeTs(7, 30) },
      byCategory['lunch']     && { meal_id: byCategory['lunch'],     meal_type: 'lunch',     eaten_at: makeTs(12, 15) },
      byCategory['dinner']    && { meal_id: byCategory['dinner'],    meal_type: 'dinner',    eaten_at: makeTs(19, 0) },
    ].filter(Boolean);

    const insertLog = db.prepare(
      'INSERT INTO meal_logs (meal_id, eaten_at, servings, meal_type) VALUES (?, ?, 1, ?)'
    );
    for (const l of sampleLogs) insertLog.run(l.meal_id, l.eaten_at, l.meal_type);
  } catch (_) {}

  res.status(201).json({
    created: insertedIds.length,
    photos: photosLoaded,
    message: `${insertedIds.length} recipes added, ${photosLoaded} photos downloaded.`,
  });
});

module.exports = router;
