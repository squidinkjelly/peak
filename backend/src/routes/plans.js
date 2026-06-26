const express = require('express');
const { db } = require('../db/schema');
const router = express.Router();

router.get('/:week', (req, res) => {
  const plan = db.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?').get(req.params.week);
  if (!plan) return res.json({ week_start_date: req.params.week, slots: [] });
  const slots = db.prepare(`
    SELECT s.*, m.name as meal_name, m.source_url,
      COALESCE(SUM(i.calories), 0) * s.servings as slot_calories
    FROM plan_slots s
    JOIN meals m ON m.id = s.meal_id
    LEFT JOIN ingredients i ON i.meal_id = m.id
    WHERE s.weekly_plan_id = ?
    GROUP BY s.id
  `).all(plan.id);
  res.json({ ...plan, slots });
});

router.post('/', (req, res) => {
  const { week_start_date } = req.body;
  const existing = db.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?').get(week_start_date);
  if (existing) return res.json(existing);
  const result = db.prepare('INSERT INTO weekly_plans (week_start_date) VALUES (?)').run(week_start_date);
  res.status(201).json(db.prepare('SELECT * FROM weekly_plans WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id/slots', (req, res) => {
  const { slots } = req.body;
  db.prepare('DELETE FROM plan_slots WHERE weekly_plan_id = ?').run(req.params.id);
  const insert = db.prepare(
    'INSERT INTO plan_slots (weekly_plan_id, meal_id, day_of_week, meal_type, servings) VALUES (?, ?, ?, ?, ?)'
  );
  for (const s of slots) {
    insert.run(req.params.id, s.meal_id, s.day_of_week, s.meal_type, s.servings ?? 1);
  }
  const updated = db.prepare(`
    SELECT s.*, m.name as meal_name, m.source_url,
      COALESCE(SUM(i.calories), 0) * s.servings as slot_calories
    FROM plan_slots s
    JOIN meals m ON m.id = s.meal_id
    LEFT JOIN ingredients i ON i.meal_id = m.id
    WHERE s.weekly_plan_id = ?
    GROUP BY s.id
  `).all(req.params.id);
  res.json(updated);
});

module.exports = router;
