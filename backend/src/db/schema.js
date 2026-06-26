const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'peak.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    default_servings REAL NOT NULL DEFAULT 1,
    notes TEXT,
    source_url TEXT,
    recipe_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    calories REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL
  );

  CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    eaten_at TEXT NOT NULL DEFAULT (datetime('now')),
    servings REAL NOT NULL DEFAULT 1,
    meal_type TEXT NOT NULL DEFAULT 'snack',
    photo_path TEXT
  );

  CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start_date TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS plan_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_plan_id INTEGER NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    meal_type TEXT NOT NULL,
    servings REAL NOT NULL DEFAULT 1
  );
`);

// Migrations for columns added after initial schema
const mealCols = db.prepare(`PRAGMA table_info(meals)`).all().map(r => r.name);
if (!mealCols.includes('source_url'))  db.exec(`ALTER TABLE meals ADD COLUMN source_url TEXT`);
if (!mealCols.includes('recipe_text')) db.exec(`ALTER TABLE meals ADD COLUMN recipe_text TEXT`);
if (!mealCols.includes('photo_path'))  db.exec(`ALTER TABLE meals ADD COLUMN photo_path TEXT`);
if (!mealCols.includes('category'))    db.exec(`ALTER TABLE meals ADD COLUMN category TEXT NOT NULL DEFAULT 'snack'`);

const slotCols = db.prepare(`PRAGMA table_info(plan_slots)`).all().map(r => r.name);
if (!slotCols.includes('servings')) db.exec(`ALTER TABLE plan_slots ADD COLUMN servings REAL NOT NULL DEFAULT 1`);

module.exports = { db, UPLOADS_DIR };
