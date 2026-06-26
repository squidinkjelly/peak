const express = require('express');
const { db } = require('../db/schema');
const router = express.Router();

router.get('/summary', (req, res) => {
  const { from, to } = req.query;
  const params = [from || '1970-01-01', to || '9999-12-31'];
  const daily = db.prepare(`
    SELECT
      date(l.eaten_at) as date,
      COALESCE(SUM(i.calories * l.servings), 0) as calories,
      COALESCE(SUM(i.protein_g * l.servings), 0) as protein,
      COALESCE(SUM(i.carbs_g * l.servings), 0) as carbs,
      COALESCE(SUM(i.fat_g * l.servings), 0) as fat,
      COUNT(DISTINCT l.id) as meal_count
    FROM meal_logs l
    LEFT JOIN ingredients i ON i.meal_id = l.meal_id
    WHERE date(l.eaten_at) BETWEEN date(?) AND date(?)
    GROUP BY date(l.eaten_at)
    ORDER BY date(l.eaten_at)
  `).all(...params);

  const totals = daily.reduce((acc, d) => ({
    calories: acc.calories + d.calories,
    protein: acc.protein + d.protein,
    carbs: acc.carbs + d.carbs,
    fat: acc.fat + d.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  res.json({ daily, totals, days: daily.length });
});

module.exports = router;
