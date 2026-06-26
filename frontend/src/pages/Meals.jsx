import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import styles from './Meals.module.css';

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
const CAT_LABELS  = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', dessert: 'Dessert' };

const emptyIngredient = () => ({ name: '', quantity: '', unit: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' });
const emptyForm = () => ({ name: '', default_servings: '1', notes: '', source_url: '', recipe_text: '', category: 'lunch', ingredients: [emptyIngredient()] });

export default function Meals() {
  const [searchParams] = useSearchParams();
  const [meals, setMeals] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [recipeTab, setRecipeTab] = useState('link');
  const [recipeModal, setRecipeModal] = useState(null);
  const modalRef = useRef();

  useEffect(() => {
    api.meals.list().then(loaded => {
      setMeals(loaded);
      const openId = Number(searchParams.get('open'));
      if (openId) {
        const target = loaded.find(m => m.id === openId);
        if (target) api.meals.get(target.id).then(setRecipeModal);
      }
    });
  }, []);

  const openNew = () => {
    setEditing('new');
    setForm(emptyForm());
    setRecipeTab('link');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = async (meal) => {
    const full = await api.meals.get(meal.id);
    setEditing(meal.id);
    setForm({
      name: full.name,
      default_servings: String(full.default_servings),
      notes: full.notes || '',
      source_url: full.source_url || '',
      recipe_text: full.recipe_text || '',
      category: full.category || 'lunch',
      ingredients: full.ingredients.length
        ? full.ingredients.map(i => ({
            ...i,
            quantity:  String(i.quantity  ?? ''),
            calories:  String(i.calories  ?? ''),
            protein_g: String(i.protein_g ?? ''),
            carbs_g:   String(i.carbs_g   ?? ''),
            fat_g:     String(i.fat_g     ?? ''),
          }))
        : [emptyIngredient()],
    });
    setRecipeTab(full.recipe_text ? 'text' : 'link');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        default_servings: Number(form.default_servings),
        ingredients: form.ingredients.map(i => ({
          ...i,
          quantity:  Number(i.quantity)  || null,
          calories:  Number(i.calories)  || null,
          protein_g: Number(i.protein_g) || null,
          carbs_g:   Number(i.carbs_g)   || null,
          fat_g:     Number(i.fat_g)     || null,
        })),
      };
      if (editing === 'new') {
        const m = await api.meals.create(payload);
        setMeals(ms => [enrichTotal(m), ...ms]);
      } else {
        const m = await api.meals.update(editing, payload);
        setMeals(ms => ms.map(x => x.id === editing ? enrichTotal(m) : x));
      }
      setEditing(null);
    } finally { setLoading(false); }
  };

  const deleteMeal = async (id) => {
    await api.meals.delete(id);
    setMeals(ms => ms.filter(m => m.id !== id));
  };

  const setIng = (idx, field, val) =>
    setForm(f => {
      const ings = [...f.ingredients];
      ings[idx] = { ...ings[idx], [field]: val };
      return { ...f, ingredients: ings };
    });

  const addIng    = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }));
  const removeIng = (idx) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));

  const openRecipe = async (meal) => {
    const full = await api.meals.get(meal.id);
    setRecipeModal(full);
  };
  const closeRecipe = () => setRecipeModal(null);

  return (
    <main>
      <div className={styles.subNav}>
        <div className={`container ${styles.subNavInner}`}>
          <span className={styles.breadcrumb}>Meals <span className={styles.count}>({meals.length})</span></span>
          <button className="btn-primary btn-sm" onClick={openNew}>+ New Meal</button>
        </div>
      </div>

      <div className="container">
        <div className={styles.page}>

          {/* ── Form panel ────────────────────────── */}
          {editing && (
            <div className={styles.formPanel}>
              <div className={styles.formPanelHead}>
                <h2 className={styles.formTitle}>{editing === 'new' ? 'NEW MEAL' : 'EDIT MEAL'}</h2>
                <button className={styles.closeBtn} onClick={() => setEditing(null)}>×</button>
              </div>

              <form onSubmit={save} className={styles.form}>

                {/* ── Name + servings ─────────────────── */}
                <div className={styles.formRow}>
                  <Field label="Meal Name">
                    <input
                      className={styles.input}
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                      placeholder="e.g. Chicken Stir-fry"
                    />
                  </Field>
                  <Field label="Default Servings">
                    <input
                      type="number" min="0.1" step="0.1"
                      className={styles.input}
                      value={form.default_servings}
                      onChange={e => setForm(f => ({ ...f, default_servings: e.target.value }))}
                    />
                  </Field>
                </div>

                <Field label="Notes (optional)">
                  <textarea
                    className={styles.input}
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Cooking tips, allergens, etc."
                  />
                </Field>

                {/* ── Category ─────────────────────────── */}
                <Field label="Category">
                  <div className={styles.catChips}>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`chip ${form.category === cat ? 'active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, category: cat }))}
                      >
                        {CAT_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* ── Recipe source ────────────────────── */}
                <div className={styles.recipeSection}>
                  <div className={styles.recipeTabs}>
                    <button
                      type="button"
                      className={`${styles.recipeTab} ${recipeTab === 'link' ? styles.recipeTabActive : ''}`}
                      onClick={() => setRecipeTab('link')}
                    >
                      Recipe Link
                    </button>
                    <button
                      type="button"
                      className={`${styles.recipeTab} ${recipeTab === 'text' ? styles.recipeTabActive : ''}`}
                      onClick={() => setRecipeTab('text')}
                    >
                      Paste Recipe
                    </button>
                  </div>

                  {recipeTab === 'link' && (
                    <Field label="Source URL">
                      <input
                        type="url"
                        className={styles.input}
                        value={form.source_url}
                        onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                        placeholder="https://example.com/recipe"
                      />
                      {form.source_url && (
                        <a
                          href={form.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.urlPreview}
                        >
                          ↗ Open link
                        </a>
                      )}
                    </Field>
                  )}

                  {recipeTab === 'text' && (
                    <Field label="Recipe Text">
                      <textarea
                        className={`${styles.input} ${styles.recipeTextarea}`}
                        rows={10}
                        value={form.recipe_text}
                        onChange={e => setForm(f => ({ ...f, recipe_text: e.target.value }))}
                        placeholder={`Paste the full recipe here — ingredients, steps, anything you want to keep alongside this meal.\n\nExample:\n1 cup rice\n200g chicken breast\n2 tbsp soy sauce\n\n1. Cook rice.\n2. Stir-fry chicken…`}
                        spellCheck={false}
                      />
                    </Field>
                  )}
                </div>

                {/* ── Ingredients / macros table ──────── */}
                <div className={styles.ingsSection}>
                  <div className={styles.ingsSectionHead}>
                    <div>
                      <span className={styles.ingsLabel}>INGREDIENTS & MACROS</span>
                      <p className={styles.ingsSub}>Enter nutrition values manually — these drive the calorie & macro totals.</p>
                    </div>
                    <button type="button" className="btn-secondary btn-sm" onClick={addIng}>+ Add Row</button>
                  </div>

                  <div className={styles.ingsGrid}>
                    <div className={styles.ingsHead}>
                      <span>Name</span>
                      <span>Qty</span>
                      <span>Unit</span>
                      <span>kcal</span>
                      <span>Protein g</span>
                      <span>Carbs g</span>
                      <span>Fat g</span>
                      <span />
                    </div>

                    {form.ingredients.map((ing, idx) => (
                      <div key={idx} className={styles.ingRow}>
                        <input className={styles.input} placeholder="Chicken breast" value={ing.name}      onChange={e => setIng(idx, 'name',      e.target.value)} />
                        <input className={styles.input} placeholder="150"            value={ing.quantity}   onChange={e => setIng(idx, 'quantity',   e.target.value)} type="number" />
                        <input className={styles.input} placeholder="g"              value={ing.unit}       onChange={e => setIng(idx, 'unit',       e.target.value)} />
                        <input className={styles.input} placeholder="0"              value={ing.calories}   onChange={e => setIng(idx, 'calories',   e.target.value)} type="number" />
                        <input className={styles.input} placeholder="0"              value={ing.protein_g}  onChange={e => setIng(idx, 'protein_g',  e.target.value)} type="number" />
                        <input className={styles.input} placeholder="0"              value={ing.carbs_g}    onChange={e => setIng(idx, 'carbs_g',    e.target.value)} type="number" />
                        <input className={styles.input} placeholder="0"              value={ing.fat_g}      onChange={e => setIng(idx, 'fat_g',      e.target.value)} type="number" />
                        <button type="button" className={styles.removeIng} onClick={() => removeIng(idx)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving…' : 'Save Meal'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* ── Meal list ─────────────────────────── */}
          {meals.length === 0 && !editing && (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>NO MEALS YET.</h2>
              <p className={styles.muted}>Create your first meal, or use the Tester button in the nav to load 15 sample recipes.</p>
              <button className="btn-primary" onClick={openNew} style={{ marginTop: 'var(--sp-lg)' }}>+ New Meal</button>
            </div>
          )}

          <div className={styles.mealList}>
            {CATEGORIES.filter(cat => meals.some(m => (m.category || 'snack') === cat)).map(cat => (
              <div key={cat} className={styles.catGroup}>
                <h2 className={styles.catHeading}>{CAT_LABELS[cat]}</h2>
                {meals.filter(m => (m.category || 'snack') === cat).map(m => (
              <article key={m.id} className={styles.mealRow} onClick={() => openRecipe(m)}>
                {/* Thumbnail */}
                <div className={styles.thumb}>
                  {m.photo_path
                    ? <img src={api.photoUrl(m.photo_path)} alt={m.name} className={styles.thumbImg} />
                    : <span className={styles.thumbInitial}>{m.name[0]}</span>
                  }
                </div>

                {/* Info */}
                <div className={styles.rowInfo}>
                  <p className={styles.rowName}>{m.name}</p>
                  <p className={styles.rowSub}>
                    <span className={styles.rowCat}>{CAT_LABELS[m.category] || m.category}</span>
                    <span className={styles.rowDot}>·</span>
                    {m.default_servings} serving{m.default_servings !== 1 ? 's' : ''}
                    <span className={styles.rowDot}>·</span>
                    {Math.round(m.total_calories)} kcal
                  </p>
                  {m.notes && <p className={styles.rowNotes}>{m.notes}</p>}
                </div>

                {/* Actions */}
                <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                  <button className="btn-secondary btn-sm" onClick={() => openEdit(m)}>Edit</button>
                  <button className={styles.delLink} onClick={() => deleteMeal(m.id)}>Delete</button>
                </div>

                <span className={styles.rowChevron}>›</span>
              </article>
                ))}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Recipe modal ──────────────────────── */}
      {recipeModal && (
        <div className={styles.modalOverlay} onClick={closeRecipe}>
          <div
            className={styles.modal}
            ref={modalRef}
            onClick={e => e.stopPropagation()}
          >
            <button className={styles.modalClose} onClick={closeRecipe}>×</button>

            {recipeModal.photo_path && (
              <div className={styles.modalPhoto}>
                <img src={api.photoUrl(recipeModal.photo_path)} alt={recipeModal.name} />
              </div>
            )}

            <div className={styles.modalBody}>
              <div className={styles.modalMeta}>
                <span className={styles.modalCategory}>{CAT_LABELS[recipeModal.category] || recipeModal.category}</span>
                <span className={styles.modalServings}>{recipeModal.default_servings} serving{recipeModal.default_servings !== 1 ? 's' : ''}</span>
              </div>

              <h2 className={styles.modalTitle}>{recipeModal.name}</h2>

              {recipeModal.notes && (
                <p className={styles.modalNotes}>{recipeModal.notes}</p>
              )}

              {recipeModal.ingredients?.length > 0 && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>INGREDIENTS</h3>
                  <ul className={styles.modalIngList}>
                    {recipeModal.ingredients.map((ing, i) => (
                      <li key={i} className={styles.modalIngItem}>
                        <span className={styles.modalIngName}>{ing.name}</span>
                        <span className={styles.modalIngDetail}>
                          {ing.quantity ? `${ing.quantity}${ing.unit ? ' ' + ing.unit : ''}` : ''}
                          {ing.calories > 0 ? ` · ${ing.calories} kcal` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recipeModal.recipe_text && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>RECIPE</h3>
                  <pre className={styles.modalRecipeText}>{recipeModal.recipe_text}</pre>
                </div>
              )}

              {recipeModal.source_url && (
                <a
                  href={recipeModal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalSourceLink}
                >
                  ↗ View full recipe source
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function enrichTotal(m) {
  return { ...m, total_calories: (m.ingredients || []).reduce((s, i) => s + (i.calories || 0), 0) };
}
