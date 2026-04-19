import { useState } from 'react';
import { Link } from 'react-router-dom';
import './ArtworkCard.css';

export default function ArtworkCard({
  artwork,
  artistName,
  username,
  mini,
  /** Maya-style portfolio: no likes, no @link, category under title */
  minimal = false,
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(artwork.likes || 0);

  const hasMedia = Boolean(artwork.mediaUrl);
  const isVideo = artwork.media_type === 'video';

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (liked) {
      setLikeCount((c) => c - 1);
    } else {
      setLikeCount((c) => c + 1);
    }
    setLiked(!liked);
  };

  return (
    <div
      className={`artwork-card${mini ? ' artwork-card--mini' : ''}${minimal ? ' artwork-card--minimal' : ''}`}
    >
      <div
        className="artwork-thumbnail"
        style={{ background: artwork.color }}
        aria-label={artwork.title}
      >
        {hasMedia && isVideo && (
          <video
            className="artwork-thumb-media"
            src={artwork.mediaUrl}
            controls
            muted
            playsInline
            preload="metadata"
          />
        )}
        {hasMedia && !isVideo && (
          <img
            className="artwork-thumb-media"
            src={artwork.mediaUrl}
            alt={artwork.title}
            loading="lazy"
          />
        )}
        {!minimal && (
          <div className="artwork-overlay">
            <span className="artwork-category">{artwork.category}</span>
          </div>
        )}
      </div>
      <div className="artwork-footer">
        <div className="artwork-meta">
          <p className="artwork-title">{artwork.title}</p>
          {minimal && artwork.category && (
            <p className="artwork-minimal-category">{artwork.category}</p>
          )}
          {!minimal && artistName && (
            <Link to={`/profile/${username}`} className="artwork-artist" onClick={(e) => e.stopPropagation()}>
              @{username}
            </Link>
          )}
        </div>
        {!minimal && (
          <button
            type="button"
            className={`like-btn${liked ? ' liked' : ''}`}
            onClick={handleLike}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <span className="like-icon">{liked ? '♥' : '♡'}</span>
            <span className="like-count">{likeCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}
