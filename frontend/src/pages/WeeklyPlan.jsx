import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './WeeklyPlan.module.css';

const DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TYPES = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack'];
const CAT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', dessert: 'Dessert', snack: 'Snack' };

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function weekLabel(start) {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(start + 'T12:00:00');
  e.setDate(e.getDate() + 6);
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function WeeklyPlan() {
  const navigate = useNavigate();
  const [weekStart,    setWeekStart]    = useState(getMonday());
  const [plan,         setPlan]         = useState(null);
  const [meals,        setMeals]        = useState([]);
  const [slots,        setSlots]        = useState({});
  const [saving,       setSaving]       = useState(false);
  const [dirty,        setDirty]        = useState(false);
  const [selectedDay,  setSelectedDay]  = useState(null);
  const [keptForWeek,  setKeptForWeek]  = useState(false);

  useEffect(() => { api.meals.list().then(setMeals); }, []);

  useEffect(() => {
    api.plans.get(weekStart).then(data => {
      setPlan(data);
      const s = {};
      for (const sl of data.slots || []) {
        s[`${sl.day_of_week}-${sl.meal_type}`] = { meal_id: sl.meal_id, servings: sl.servings ?? 1 };
      }
      setSlots(s);
      setDirty(false);
      setKeptForWeek(false);
    });
  }, [weekStart]);

  const toggleMeal = (dayIdx, type, mealId) => {
    const key = `${dayIdx}-${type}`;
    if (slots[key]?.meal_id === mealId) {
      setSlots(s => { const n = { ...s }; delete n[key]; return n; });
    } else {
      setSlots(s => ({ ...s, [key]: { meal_id: mealId, servings: 1 } }));
    }
    setDirty(true);
    setKeptForWeek(false);
  };

  const removeSlot = (key) => {
    setSlots(s => { const n = { ...s }; delete n[key]; return n; });
    setDirty(true);
    setKeptForWeek(false);
  };

  const keepForWeek = () => {
    if (selectedDay === null) return;
    const next = { ...slots };
    TYPES.forEach(type => {
      const src = slots[`${selectedDay}-${type}`];
      DAYS.forEach((_, di) => {
        if (di === selectedDay) return;
        const k = `${di}-${type}`;
        if (src) { next[k] = { ...src }; }
        else { delete next[k]; }
      });
    });
    setSlots(next);
    setDirty(true);
    setKeptForWeek(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      let planId = plan?.id;
      if (!planId) {
        const created = await api.plans.create(weekStart);
        planId = created.id;
        setPlan(created);
      }
      const slotArr = Object.entries(slots)
        .filter(([, v]) => v?.meal_id)
        .map(([key, v]) => {
          const [day_of_week, meal_type] = key.split('-');
          return { meal_id: v.meal_id, day_of_week: Number(day_of_week), meal_type, servings: v.servings };
        });
      await api.plans.updateSlots(planId, slotArr);
      setDirty(false);
    } finally { setSaving(false); }
  };

  const shiftWeek = (n) => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + n * 7);
    setWeekStart(d.toISOString().slice(0, 10));
    setSelectedDay(null);
  };

  const getMeal   = (id)  => meals.find(m => m.id === id);
  const byCategory = (cat) => meals.filter(m => (m.category || 'snack') === cat);

  const dayTotals = DAYS.map((_, di) =>
    TYPES.reduce((sum, type) => {
      const slot = slots[`${di}-${type}`];
      const meal = slot && getMeal(slot.meal_id);
      return sum + (meal ? meal.total_calories * (slot.servings ?? 1) : 0);
    }, 0)
  );

  const selectedDayHasAny = selectedDay !== null &&
    TYPES.some(type => slots[`${selectedDay}-${type}`]?.meal_id);

  return (
    <main className={styles.root}>
      {/* ── Sub-nav ──────────────────────────────── */}
      <div className={styles.subNav}>
        <div className={`container ${styles.subNavInner}`}>
          <div className={styles.weekNav}>
            <button className="btn-icon" onClick={() => shiftWeek(-1)}>←</button>
            <span className={styles.weekLabel}>{weekLabel(weekStart)}</span>
            <button className="btn-icon" onClick={() => shiftWeek(1)}>→</button>
          </div>
          <div className={styles.subNavRight}>
            <button className={styles.planAheadBtn} onClick={() => shiftWeek(1)}>
              Plan next week →
            </button>
            {dirty && (
              <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Plan'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.page}>
          <h1 className={styles.title}>WEEKLY PLAN</h1>

          {/* ── Day tabs ─────────────────────────── */}
          <div className={styles.dayTabs}>
            {DAYS.map((day, di) => {
              const kcal = dayTotals[di];
              const slotCount = TYPES.filter(t => slots[`${di}-${t}`]?.meal_id).length;
              return (
                <button
                  key={di}
                  className={`${styles.dayTab} ${selectedDay === di ? styles.dayTabActive : ''} ${slotCount > 0 ? styles.dayTabFilled : ''}`}
                  onClick={() => setSelectedDay(selectedDay === di ? null : di)}
                >
                  <span className={styles.dayTabName}>{day.slice(0, 3).toUpperCase()}</span>
                  {slotCount > 0
                    ? <span className={styles.dayTabKcal}>{Math.round(kcal)} kcal</span>
                    : <span className={styles.dayTabEmpty}>No meals</span>
                  }
                </button>
              );
            })}
          </div>

          {/* ── Picker + Grid side by side ───────── */}
          <div className={`${styles.splitLayout} ${selectedDay !== null ? styles.splitLayoutActive : ''}`}>

            {/* ── Meal picker ────────────────────── */}
            {selectedDay !== null && (
              <div className={styles.picker}>
                <div className={styles.pickerHead}>
                  <h2 className={styles.pickerTitle}>
                    {DAYS[selectedDay]}
                  </h2>
                  {selectedDayHasAny && !keptForWeek && (
                    <button className={styles.keepBtn} onClick={keepForWeek}>
                      Love it? Keep it for the week ★
                    </button>
                  )}
                  {keptForWeek && (
                    <span className={styles.keptBadge}>Applied to every day ✓</span>
                  )}
                  <div className={styles.clearBtns}>
                    <button className={styles.clearDayBtn} onClick={() => {
                      setSlots(s => {
                        const n = { ...s };
                        TYPES.forEach(type => delete n[`${selectedDay}-${type}`]);
                        return n;
                      });
                      setDirty(true);
                      setKeptForWeek(false);
                    }}>
                      Clear day
                    </button>
                    <button className={styles.clearDayBtn} onClick={() => {
                      setSlots({});
                      setDirty(true);
                      setKeptForWeek(false);
                    }}>
                      Clear week
                    </button>
                  </div>
                </div>

                {meals.length === 0 ? (
                  <p className={styles.pickerEmpty}>
                    No meals yet. <a href="/meals">Create some →</a>
                  </p>
                ) : (
                  <div className={styles.pickerCategories}>
                    {TYPES.map(type => {
                      const catMeals = byCategory(type);
                      if (catMeals.length === 0) return null;
                      const key = `${selectedDay}-${type}`;
                      const currentId = slots[key]?.meal_id;
                      return (
                        <div key={type} className={styles.pickerCat}>
                          <div className={styles.pickerCatHead}>
                            <span className={styles.pickerCatLabel}>{CAT_LABELS[type]}</span>
                            {currentId && (
                              <button className={styles.clearSlot} onClick={() => removeSlot(key)}>
                                Clear
                              </button>
                            )}
                          </div>
                          <div className={styles.pickerMeals}>
                            {catMeals.map(meal => {
                              const active = currentId === meal.id;
                              return (
                                <button
                                  key={meal.id}
                                  className={`${styles.mealOption} ${active ? styles.mealOptionActive : ''}`}
                                  onClick={() => toggleMeal(selectedDay, type, meal.id)}
                                >
                                  <div className={styles.mealOptThumb}>
                                    {meal.photo_path
                                      ? <img src={api.photoUrl(meal.photo_path)} alt="" className={styles.mealOptImg} />
                                      : <span className={styles.mealOptInitial}>{meal.name[0]}</span>
                                    }
                                  </div>
                                  <div className={styles.mealOptInfo}>
                                    <p className={styles.mealOptName}>{meal.name}</p>
                                    <p className={styles.mealOptSub}>{Math.round(meal.total_calories)} kcal</p>
                                  </div>
                                  <span className={styles.mealOptCheck}>{active ? '✓' : '+'}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Week overview grid ─────────────── */}
            <div className={styles.gridWrap}>
            <div className={styles.grid}>
              {/* Header row: corner + meal type columns */}
              <div className={styles.corner} />
              {TYPES.map(type => (
                <div key={type} className={styles.typeHeader}>
                  {CAT_LABELS[type]}
                </div>
              ))}

              {/* Day rows */}
              {DAYS.map((day, di) => (
                <>
                  <button
                    key={`day-${di}`}
                    className={`${styles.dayLabel} ${selectedDay === di ? styles.dayLabelActive : ''}`}
                    onClick={() => setSelectedDay(selectedDay === di ? null : di)}
                  >
                    <span className={styles.dayLabelName}>{day.slice(0, 3).toUpperCase()}</span>
                    {dayTotals[di] > 0 && (
                      <span className={styles.dayLabelKcal}>{Math.round(dayTotals[di])} kcal</span>
                    )}
                  </button>
                  {TYPES.map(type => {
                    const key  = `${di}-${type}`;
                    const slot = slots[key];
                    const meal = slot && getMeal(slot.meal_id);
                    return (
                      <div
                        key={key}
                        className={`${styles.cell} ${meal ? styles.cellFilled : styles.cellEmpty} ${selectedDay === di ? styles.cellSelected : ''}`}
                        onClick={() => setSelectedDay(selectedDay === di ? null : di)}
                      >
                        {meal ? (
                          <div className={styles.slotCard}>
                            <div className={styles.slotCircle}>
                              {meal.photo_path
                                ? <img src={api.photoUrl(meal.photo_path)} alt="" className={styles.slotPhoto} />
                                : <span className={styles.slotInitial}>{meal.name[0]}</span>
                              }
                            </div>
                            <div className={styles.slotInfo}>
                              <p className={styles.slotName}>{meal.name}</p>
                              <p className={styles.slotKcal}>{Math.round(meal.total_calories * (slot.servings ?? 1))} kcal</p>
                              <button
                                className={styles.makeBtn}
                                onClick={e => { e.stopPropagation(); navigate(`/meals?open=${meal.id}`); }}
                              >
                                Make →
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className={styles.cellHint}>+</span>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          </div>{/* end splitLayout */}

        </div>
      </div>
    </main>
  );
}
