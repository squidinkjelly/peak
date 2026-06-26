import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import styles from './History.module.css';

const FILTERS = ['all', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack'];
const MEAL_ORDER = { breakfast: 0, lunch: 1, dinner: 2, snack: 3, dessert: 4 };
const CAT_LABELS = { all: 'All', breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', dessert: 'Dessert' };

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function History() {
  const [logs,    setLogs]    = useState([]);
  const [meals,   setMeals]   = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.logs.list(), api.meals.list()]).then(([l, m]) => {
      setLogs(l);
      setMeals(m);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.meal_type === filter);

  const deleteLog = async (id) => {
    await api.logs.delete(id);
    setLogs(l => l.filter(x => x.id !== id));
  };

  // Catalog meals filtered by active tab
  const catalogMeals = filter === 'all'
    ? meals
    : meals.filter(m => (m.category || 'snack') === filter);

  // Group logs by date
  const grouped = filtered.reduce((acc, log) => {
    const date = log.eaten_at.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  for (const d of dates) {
    grouped[d].sort((a, b) => (MEAL_ORDER[a.meal_type] ?? 99) - (MEAL_ORDER[b.meal_type] ?? 99));
  }

  return (
    <main>
      <div className={styles.subNav}>
        <div className={`container ${styles.subNavInner}`}>
          <span className={styles.breadcrumb}>History</span>
          <div className={styles.filters}>
            {FILTERS.map(t => (
              <button
                key={t}
                className={`chip ${filter === t ? 'active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {CAT_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.page}>
          {loading && <p className={styles.muted}>Loading…</p>}

          {/* ── Logged meals ────────────────────── */}
          {dates.map(date => {
            const dayLogs = grouped[date];
            const dayKcal = dayLogs.reduce((s, l) => s + l.total_calories, 0);
            return (
              <section key={date} className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <h2 className={styles.dateLabel}>{fmtDate(date + 'T12:00:00')}</h2>
                  <span className={styles.dateTotals}>{Math.round(dayKcal)} kcal</span>
                </div>
                <div className={styles.cardGrid}>
                  {dayLogs.map(log => (
                    <article key={log.id} className={styles.card}>
                      <button className={styles.delBtn} onClick={() => deleteLog(log.id)} aria-label="Delete">×</button>
                      <div className={styles.cardCircle}>
                        {log.photo_path
                          ? <img src={api.photoUrl(log.photo_path)} alt={log.meal_name} className={styles.cardPhoto} loading="lazy" />
                          : <span className={styles.cardInitial}>{log.meal_name[0]}</span>
                        }
                      </div>
                      <div className={styles.cardBody}>
                        <span className={styles.typeTag}>{CAT_LABELS[log.meal_type] || log.meal_type}</span>
                        <p className={styles.cardName}>{log.meal_name}</p>
                        <p className={styles.cardSub}>{fmtTime(log.eaten_at)} · {log.servings} serving{log.servings !== 1 ? 's' : ''}</p>
                        <div className={styles.macros}>
                          <MacroChip val={Math.round(log.total_calories)} label="kcal" />
                          <MacroChip val={`${Math.round(log.total_protein)}g`} label="protein" />
                          <MacroChip val={`${Math.round(log.total_carbs)}g`}   label="carbs" />
                          <MacroChip val={`${Math.round(log.total_fat)}g`}     label="fat" />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {/* ── Meal catalog — always visible, filtered by tab ── */}
          {!loading && catalogMeals.length > 0 && (
            <section className={styles.catalogSection}>
              <div className={styles.catalogHeader}>
                <h2 className={styles.catalogTitle}>
                  {filter === 'all' ? 'ALL MEALS' : `${CAT_LABELS[filter].toUpperCase()} MEALS`}
                </h2>
              </div>
              <div className={styles.cardGrid}>
                {catalogMeals.map(meal => (
                  <article key={meal.id} className={`${styles.card} ${styles.catalogCard}`}>
                    <div className={styles.cardCircle}>
                      {meal.photo_path
                        ? <img src={api.photoUrl(meal.photo_path)} alt={meal.name} className={styles.cardPhoto} loading="lazy" />
                        : <span className={styles.cardInitial}>{meal.name[0]}</span>
                      }
                    </div>
                    <div className={styles.cardBody}>
                      <span className={styles.typeTag}>{CAT_LABELS[meal.category] || meal.category}</span>
                      <p className={styles.cardName}>{meal.name}</p>
                      <p className={styles.cardSub}>{Math.round(meal.total_calories)} kcal · {meal.default_servings} serving{meal.default_servings !== 1 ? 's' : ''}</p>
                      <Link to="/log" className={styles.logBtn}>+ Log this meal</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!loading && filtered.length === 0 && catalogMeals.length === 0 && (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>NO MEALS YET.</h2>
              <p className={styles.muted}>Start logging to see your history here.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function MacroChip({ val, label }) {
  return (
    <div className={styles.macroChip}>
      <span className={styles.macroVal}>{val}</span>
      <span className={styles.macroLabel}>{label}</span>
    </div>
  );
}
