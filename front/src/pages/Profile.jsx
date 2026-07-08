import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

export default function Profile() {
  const { username } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get(`/users/${username}`).then(({ data }) => setUser(data.user));
  }, [username]);

  if (!user) return <p className="mt-4 text-center text-secondary">Завантаження...</p>;

  return (
    <div className="col-md-6 mx-auto mt-4">
      <div className="card">
        <div className="card-body">
          <h4>u/{user.username}</h4>
          {user.bio && <p>{user.bio}</p>}
          <div className="d-flex gap-4 small text-secondary">
            <span>Карма постів: {user.postKarma}</span>
            <span>Карма коментарів: {user.commentKarma}</span>
          </div>
          <div className="d-flex gap-4 small text-secondary mt-1">
            <span>Постів: {user.postCount}</span>
            <span>Коментарів: {user.commentCount}</span>
          </div>
          <p className="small text-secondary mt-2">На платформі з {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
