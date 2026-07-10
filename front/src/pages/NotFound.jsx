import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="col-md-6 mx-auto mt-5 text-center">
      <h2>404</h2>
      <p className="text-secondary">Сторінку не знайдено.</p>
      <Link className="btn btn-primary btn-sm" to="/">На головну</Link>
    </div>
  );
}
