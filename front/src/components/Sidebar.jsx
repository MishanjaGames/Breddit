import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="side-nav pe-2">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>🏠 Головна</NavLink>
      <NavLink to="/?tab=popular" className="">🔥 Популярне</NavLink>
      <NavLink to="/?tab=all" className="">🌐 Все</NavLink>
      <div className="eyebrow">Спільноти</div>
      <NavLink to="/r/new">＋ Створити спільноту</NavLink>
    </div>
  );
}