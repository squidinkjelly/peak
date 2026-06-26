const express = require('express');
const multer = require('multer');
const path = require('path');
const { db, UPLOADS_DIR } = require('../db/schema');
const router = express.Router();

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const { from, to } = req.query;
  let query = `
    SELECT l.id, l.meal_id, l.eaten_at, l.servings, l.meal_type,
      COALESCE(l.photo_path, m.photo_path) as photo_path,
      m.name as meal_name,
      COALESCE(SUM(i.calories) * l.servings, 0) as total_calories,
      COALESCE(SUM(i.protein_g) * l.servings, 0) as total_protein,
      COALESCE(SUM(i.carbs_g) * l.servings, 0) as total_carbs,
      COALESCE(SUM(i.fat_g) * l.servings, 0) as total_fat
    FROM meal_logs l
    JOIN meals m ON m.id = l.meal_id
    LEFT JOIN ingredients i ON i.meal_id = l.meal_id
  `;
  const params = [];
  if (from && to) {
    query += ' WHERE l.eaten_at BETWEEN ? AND ?';
    params.push(from, to);
  } else if (from) {
    query += ' WHERE l.eaten_at >= ?';
    params.push(from);
  }
  query += ' GROUP BY l.id ORDER BY l.eaten_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', upload.single('photo'), (req, res) => {
  const { meal_id, eaten_at, servings = 1, meal_type = 'snack' } = req.body;
  const photo_path = req.file ? req.file.filename : null;
  const result = db.prepare('INSERT INTO meal_logs (meal_id, eaten_at, servings, meal_type, photo_path) VALUES (?, ?, ?, ?, ?)').run(meal_id, eaten_at || new Date().toISOString(), servings, meal_type, photo_path);
  const log = db.prepare(`
    SELECT l.id, l.meal_id, l.eaten_at, l.servings, l.meal_type,
      COALESCE(l.photo_path, m.photo_path) as photo_path,
      m.name as meal_name,
      COALESCE(SUM(i.calories) * l.servings, 0) as total_calories,
      COALESCE(SUM(i.protein_g) * l.servings, 0) as total_protein,
      COALESCE(SUM(i.carbs_g) * l.servings, 0) as total_carbs,
      COALESCE(SUM(i.fat_g) * l.servings, 0) as total_fat
    FROM meal_logs l
    JOIN meals m ON m.id = l.meal_id
    LEFT JOIN ingredients i ON i.meal_id = l.meal_id
    WHERE l.id = ?
    GROUP BY l.id
  `).get(result.lastInsertRowid);
  res.status(201).json(log);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM meal_logs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
