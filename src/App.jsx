import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Dashboard from './pages/Dashboard';
import LogMeal from './pages/LogMeal';
import History from './pages/History';
import Meals from './pages/Meals';
import WeeklyPlan from './pages/WeeklyPlan';

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log" element={<LogMeal />} />
        <Route path="/history" element={<History />} />
        <Route path="/meals" element={<Meals />} />
        <Route path="/plan" element={<WeeklyPlan />} />
      </Routes>
    </BrowserRouter>
  );
}
