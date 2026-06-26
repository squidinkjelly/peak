import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './LogMeal.module.css';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack'];
const CAT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', dessert: 'Dessert' };

export default function LogMeal() {
  const [meals, setMeals] = useState([]);
  const [fullMeal, setFullMeal] = useState(null); // meal with ingredients
  const [form, setForm] = useState({
    meal_id: '',
    eaten_at: new Date().toISOString().slice(0, 16),
    servings: '1',
    meal_type: 'lunch',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.meals.list().then(setMeals); }, []);

  const onMealSelect = async (e) => {
    const id = e.target.value;
    const meal = meals.find(m => String(m.id) === id);
    setForm(f => ({ ...f, meal_id: id, meal_type: meal?.category || f.meal_type }));
    if (id) {
      const full = await api.meals.get(id);
      setFullMeal(full);
    } else {
      setFullMeal(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.meal_id) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      await api.logs.create(fd);
      navigate('/history');
    } finally { setLoading(false); }
  };

  const selectedMeal = meals.find(m => String(m.id) === String(form.meal_id));
  const servings = Number(form.servings) || 1;
  const kcal = selectedMeal ? Math.round(selectedMeal.total_calories * servings) : null;

  const byCategory = MEAL_TYPES.reduce((acc, cat) => {
    acc[cat] = meals.filter(m => (m.category || 'snack') === cat);
    return acc;
  }, {});

  return (
    <main>
      <div className={styles.subNav}>
        <div className={`container ${styles.subNavInner}`}>
          <span className={styles.breadcrumb}>Log Meal</span>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* ── Left column: form + recipe ─────────── */}
          <div className={styles.leftCol}>
            <form onSubmit={submit} className={styles.form}>
              <h1 className={styles.title}>LOG A MEAL</h1>

              <Field label="Meal">
                <select
                  className={styles.select}
                  value={form.meal_id}
                  onChange={onMealSelect}
                  required
                >
                  <option value="">Select from your catalog…</option>
                  {MEAL_TYPES.map(cat => {
                    const catMeals = byCategory[cat];
                    if (catMeals.length === 0) return null;
                    return (
                      <optgroup key={cat} label={CAT_LABELS[cat]}>
                        {catMeals.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} · {Math.round(m.total_calories)} kcal
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                {meals.length === 0 && (
                  <p className={styles.hint}>
                    No meals yet. <a href="/meals" className={styles.hintLink}>Create one first →</a>
                  </p>
                )}
              </Field>

              <div className={styles.row2}>
                <Field label="Servings">
                  <input
                    type="number" min="0.1" step="0.1"
                    className={styles.input}
                    value={form.servings}
                    onChange={e => setForm(f => ({ ...f, servings: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Date & Time">
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={form.eaten_at}
                    onChange={e => setForm(f => ({ ...f, eaten_at: e.target.value }))}
                    required
                  />
                </Field>
              </div>

              <Field label="Meal Type">
                <div className={styles.chips}>
                  {MEAL_TYPES.map(t => (
                    <button
                      key={t} type="button"
                      className={`chip ${form.meal_type === t ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, meal_type: t }))}
                    >
                      {CAT_LABELS[t]}
                    </button>
                  ))}
                </div>
              </Field>

              <div className={styles.actions}>
                <button type="submit" className="btn-primary" disabled={loading || !form.meal_id}>
                  {loading ? 'Saving…' : 'Log Meal'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
              </div>
            </form>

            {/* ── Recipe + Ingredients (bottom left) ── */}
            {fullMeal && (
              <div className={styles.recipePanel}>
                {fullMeal.ingredients?.length > 0 && (
                  <div className={styles.recipeSection}>
                    <h3 className={styles.recipeSectionTitle}>INGREDIENTS</h3>
                    <ul className={styles.ingList}>
                      {fullMeal.ingredients.map((ing, i) => (
                        <li key={i} className={styles.ingItem}>
                          <span className={styles.ingName}>{ing.name}</span>
                          {ing.quantity && (
                            <span className={styles.ingQty}>{ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}</span>
                          )}
                          {ing.calories > 0 && (
                            <span className={styles.ingKcal}>{ing.calories} kcal</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fullMeal.recipe_text && (
                  <div className={styles.recipeSection}>
                    <h3 className={styles.recipeSectionTitle}>RECIPE</h3>
                    <pre className={styles.recipeText}>{fullMeal.recipe_text}</pre>
                  </div>
                )}

                {fullMeal.source_url && (
                  <a
                    href={fullMeal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    ↗ View full recipe
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Right column: nutrition summary ──── */}
          <aside className={styles.preview}>
            {selectedMeal ? (
              <>
                {selectedMeal.photo_path && (
                  <div className={styles.previewPhotoWrap}>
                    <img
                      src={api.photoUrl(selectedMeal.photo_path)}
                      alt={selectedMeal.name}
                      className={styles.previewPhoto}
                    />
                  </div>
                )}
                <div className={styles.previewMeta}>
                  <p className={styles.previewMealName}>{selectedMeal.name}</p>
                  <p className={styles.previewSub}>
                    {CAT_LABELS[form.meal_type]} · {form.servings} serving{form.servings !== '1' ? 's' : ''}
                  </p>
                  <div className={styles.kcalRow}>
                    <span className={styles.kcalNum}>{kcal}</span>
                    <span className={styles.kcalUnit}>kcal</span>
                  </div>
                  <p className={styles.previewTime}>
                    {form.eaten_at && new Date(form.eaten_at).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
              </>
            ) : (
              <div className={styles.previewEmpty}>
                <div className={styles.previewEmptyFace} />
                <p className={styles.previewHint}>Select a meal to preview nutrition.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}
