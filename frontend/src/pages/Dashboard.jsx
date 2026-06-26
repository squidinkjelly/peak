import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './Dashboard.module.css';

const pad = n => String(n).padStart(2, '0');
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayStr = () => localDate();
const nDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d); };

export default function Dashboard() {
  const [weekSummary, setWeekSummary] = useState(null);
  const [todayData, setTodayData] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, meal_count: 0 });
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const fetchData = () => {
    const t = todayStr();
    Promise.all([
      api.nutrition.summary(nDaysAgo(6), t),
      api.nutrition.summary(t, t),
    ]).then(([week, day]) => {
      setWeekSummary(week);
      setTodayData(day.daily[0] || { calories: 0, protein: 0, carbs: 0, fat: 0, meal_count: 0 });
    });
  };

  const seed = async () => {
    setSeeding(true);
    try { await api.seed(); fetchData(); }
    finally { setSeeding(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const maxCal = weekSummary
    ? Math.max(...weekSummary.daily.map(d => d.calories), 1)
    : 1;

  return (
    <main>
      {/* ── Campaign hero ───────────────────────── */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroLeft}>
            <p className={styles.eyebrow}>{dateLabel}</p>
            <h1 className={styles.headline}>
              REACH<br />THE<br />SUMMIT.
            </h1>
            <p className={styles.motto}>
              Peak Nutrition.&nbsp; Peak Tracking.&nbsp; Peak Health.
            </p>
            <div className={styles.heroCtas}>
              <Link to="/log" className={`btn-primary ${styles.heroCta}`}>Log a Meal</Link>
              <button className={`btn-secondary ${styles.heroCta}`} onClick={seed} disabled={seeding}>
                {seeding ? 'Adding…' : 'Tester'}
              </button>
            </div>
          </div>

          <div className={styles.todayPanel}>
            <p className={styles.panelLabel}>Today</p>
            <div className={styles.bigKcal}>
              <span className={styles.bigNum}>{Math.round(todayData.calories)}</span>
              <span className={styles.bigUnit}>kcal</span>
            </div>
            <div className={styles.macroRow}>
              <MacroItem label="Protein" value={Math.round(todayData.protein)} unit="g" />
              <MacroItem label="Carbs"   value={Math.round(todayData.carbs)}   unit="g" />
              <MacroItem label="Fat"     value={Math.round(todayData.fat)}      unit="g" />
            </div>
            <p className={styles.mealCount}>
              {todayData.meal_count} meal{todayData.meal_count !== 1 ? 's' : ''} logged
            </p>
            <Link to="/log" className="btn-secondary" style={{ marginTop: 'var(--sp-lg)', width: '100%', justifyContent: 'center' }}>
              + Log Another
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7-day bar chart ─────────────────────── */}
      {weekSummary && (
        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>LAST 7 DAYS</h2>
              {weekSummary.days > 0 && (
                <div className={styles.weekTotals}>
                  <span><strong>{Math.round(weekSummary.totals.calories)}</strong> kcal</span>
                  <span><strong>{Math.round(weekSummary.totals.protein)}g</strong> protein</span>
                  <span><strong>{Math.round(weekSummary.totals.carbs)}g</strong> carbs</span>
                  <span><strong>{Math.round(weekSummary.totals.fat)}g</strong> fat</span>
                </div>
              )}
            </div>

            {weekSummary.days === 0 ? (
              <div className={styles.emptyState}>
                <p>No meals logged yet.</p>
                <Link to="/log" className="btn-primary" style={{ marginTop: 'var(--sp-lg)' }}>Log your first meal</Link>
              </div>
            ) : (
              <div className={styles.barChart}>
                {weekSummary.daily.map(d => {
                  const pct = Math.round((d.calories / maxCal) * 100);
                  const date = new Date(d.date + 'T12:00:00');
                  const isToday = d.date === todayStr();
                  return (
                    <div key={d.date} className={`${styles.bar} ${isToday ? styles.barToday : ''}`}>
                      <span className={styles.barKcal}>{Math.round(d.calories)}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ height: `${pct}%` }} />
                      </div>
                      <span className={styles.barDay}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className={styles.barDate}>{date.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Quick links ─────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>QUICK ACCESS</h2>
          <div className={styles.quickGrid}>
            <QuickCard to="/meals"   title="MEALS"       sub="Manage your catalog" />
            <QuickCard to="/history" title="HISTORY"     sub="Browse past logs" />
            <QuickCard to="/plan"    title="WEEKLY PLAN" sub="Arrange this week" />
          </div>
        </div>
      </section>
    </main>
  );
}

function MacroItem({ label, value, unit }) {
  return (
    <div className={styles.macroItem}>
      <span className={styles.macroVal}>{value}<span className={styles.macroUnit}>{unit}</span></span>
      <span className={styles.macroLabel}>{label}</span>
    </div>
  );
}

function QuickCard({ to, title, sub }) {
  return (
    <Link to={to} className={styles.quickCard}>
      <div className={styles.quickCardInner}>
        <p className={styles.quickTitle}>{title}</p>
        <p className={styles.quickSub}>{sub}</p>
      </div>
      <span className={styles.quickArrow}>→</span>
    </Link>
  );
}
