import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Notifications() {
  const [items, setItems] = useState([]);

  const load = () => api.get('/notifications').then(({ data }) => setItems(data.notifications));

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    load();
  };

  return (
    <div className="col-md-6 mx-auto mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Сповіщення</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={markAllRead}>Прочитати всі</button>
      </div>
      {items.map((n) => (
        <div key={n.id} className={`card mb-2 ${n.isRead ? '' : 'border-primary'}`}>
          <div className="card-body py-2 d-flex justify-content-between align-items-center">
            <span>{n.message}</span>
            {!n.isRead && (
              <button className="btn btn-sm btn-link" onClick={() => markRead(n.id)}>Прочитано</button>
            )}
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-secondary">Немає сповіщень.</p>}
    </div>
  );
}
