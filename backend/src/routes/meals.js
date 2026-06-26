const express = require('express');
const multer = require('multer');
const path = require('path');
const { db, UPLOADS_DIR } = require('../db/schema');
const router = express.Router();

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `meal-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const meals = db.prepare(`
    SELECT m.*, COALESCE(SUM(i.calories), 0) as total_calories
    FROM meals m
    LEFT JOIN ingredients i ON i.meal_id = m.id
    GROUP BY m.id
    ORDER BY m.name
  `).all();
  res.json(meals);
});

router.get('/:id', (req, res) => {
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Not found' });
  meal.ingredients = db.prepare('SELECT * FROM ingredients WHERE meal_id = ?').all(meal.id);
  res.json(meal);
});

router.post('/', upload.single('photo'), (req, res) => {
  const { name, default_servings = 1, notes, source_url, recipe_text, category = 'snack', ingredients } = req.body;
  const photo_path = req.file ? req.file.filename : null;
  const ings = ingredients ? (typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients) : [];
  const result = db.prepare(
    'INSERT INTO meals (name, default_servings, notes, source_url, recipe_text, photo_path, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, default_servings, notes, source_url || null, recipe_text || null, photo_path, category);
  const mealId = result.lastInsertRowid;
  const insertIng = db.prepare('INSERT INTO ingredients (meal_id, name, quantity, unit, calories, protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const ing of ings) {
    insertIng.run(mealId, ing.name, ing.quantity, ing.unit, ing.calories, ing.protein_g, ing.carbs_g, ing.fat_g);
  }
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(mealId);
  meal.ingredients = db.prepare('SELECT * FROM ingredients WHERE meal_id = ?').all(mealId);
  res.status(201).json(meal);
});

router.put('/:id', upload.single('photo'), (req, res) => {
  const { name, default_servings, notes, source_url, recipe_text, category = 'snack', ingredients } = req.body;
  const ings = ingredients ? (typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients) : [];
  const existing = db.prepare('SELECT photo_path FROM meals WHERE id = ?').get(req.params.id);
  const photo_path = req.file ? req.file.filename : (req.body.keep_photo === 'true' ? existing?.photo_path : null);
  db.prepare(
    'UPDATE meals SET name = ?, default_servings = ?, notes = ?, source_url = ?, recipe_text = ?, photo_path = ?, category = ? WHERE id = ?'
  ).run(name, default_servings, notes, source_url || null, recipe_text || null, photo_path, category, req.params.id);
  db.prepare('DELETE FROM ingredients WHERE meal_id = ?').run(req.params.id);
  const insertIng = db.prepare('INSERT INTO ingredients (meal_id, name, quantity, unit, calories, protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const ing of ings) {
    insertIng.run(req.params.id, ing.name, ing.quantity, ing.unit, ing.calories, ing.protein_g, ing.carbs_g, ing.fat_g);
  }
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
  meal.ingredients = db.prepare('SELECT * FROM ingredients WHERE meal_id = ?').all(req.params.id);
  res.json(meal);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
