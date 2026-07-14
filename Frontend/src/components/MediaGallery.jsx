import { mediaUrl } from '../utils/media';

// Renders media items stored on a Post/Comment: [{ _id, url, type, mimeType }]
export default function MediaGallery({ media }) {
  if (!Array.isArray(media) || media.length === 0) return null;

  return (
    <div className={`media-gallery ${media.length > 1 ? 'media-gallery-multi' : ''}`}>
      {media.map((m) => {
        const src = mediaUrl(m.url);
        if (m.type === 'video') {
          return <video key={m._id} className="media-gallery-item" src={src} controls />;
        }
        if (m.type === 'audio') {
          return <audio key={m._id} className="media-gallery-item media-gallery-audio" src={src} controls />;
        }
        return <img key={m._id} className="media-gallery-item" src={src} alt="" loading="lazy" />;
      })}
    </div>
  );
}
