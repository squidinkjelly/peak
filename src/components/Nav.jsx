import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './Nav.module.css';

export default function Nav() {
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const seed = async () => {
    setSeeding(true);
    try {
      await api.seed();
      window.location.href = '/';
    } finally { setSeeding(false); }
  };

  return (
    <header className={styles.header}>
      <div className={styles.utilityBar}>
        <div className={`container ${styles.utilityInner}`}>
          <span>Personal · Self-Hosted</span>
          <nav className={styles.utilityLinks}>
            <span>Peak Nutrition</span>
          </nav>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={`container ${styles.inner}`}>
          <Link to="/" className={styles.logo}>PEAK</Link>
          <div className={styles.links}>
            <NavLink to="/log"     className={({ isActive }) => isActive ? styles.active : undefined}>Log Meal</NavLink>
            <NavLink to="/history" className={({ isActive }) => isActive ? styles.active : undefined}>History</NavLink>
            <NavLink to="/meals"   className={({ isActive }) => isActive ? styles.active : undefined}>Meals</NavLink>
            <NavLink to="/plan"    className={({ isActive }) => isActive ? styles.active : undefined}>Weekly Plan</NavLink>
          </div>
          <button className={styles.testerBtn} onClick={seed} disabled={seeding}>
            {seeding ? 'Adding…' : 'Tester'}
          </button>
        </div>
      </nav>
    </header>
  );
}
