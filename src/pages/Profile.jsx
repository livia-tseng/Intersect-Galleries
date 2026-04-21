import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { users } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import {
  deletePortfolioItemForCurrentUser,
  fetchProfileByUsername,
  mapProfileRowsToViewModel,
  setFollowTarget,
} from '../lib/supabaseProfiles';
import { normalizePortfolioTemplate } from '../lib/portfolioTemplate';
import { PortfolioWorksSection } from '../components/portfolioTemplates/PortfolioLayouts';
import './Profile.css';

function websiteHref(website) {
  const w = String(website || '').trim();
  if (!w) return '';
  if (/^https?:\/\//i.test(w)) return w;
  return `https://${w}`;
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { session, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState('');
  const [activeTab, setActiveTab] = useState('works');
  const [workDeleteError, setWorkDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const uname = String(username).toLowerCase().trim();
      try {
        const viewerId = session?.user?.id ?? null;
        const row = await fetchProfileByUsername(uname, viewerId);
        if (cancelled) return;
        if (row) {
          setUser(mapProfileRowsToViewModel(row.profile, row.items, row.stats));
          setFollowing(row.stats?.viewerFollows ?? false);
        } else {
          const mock = users.find((u) => u.username === uname);
          setFollowing(false);
          setUser(
            mock
              ? {
                  ...mock,
                  portfolio_template: mock.portfolio_template || 'minimalist',
                  _source: 'mock',
                }
              : null,
          );
        }
      } catch (e) {
        console.error(e);
        const mock = users.find((u) => u.username === uname);
        if (!cancelled) {
          setFollowing(false);
          setUser(
            mock
              ? {
                  ...mock,
                  portfolio_template: mock.portfolio_template || 'minimalist',
                  _source: 'mock',
                }
              : null,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, session?.user?.id]);

  const isOwner = useMemo(() => {
    if (!user) return false;
    if (user._source === 'supabase' && session?.user?.id === user.id) return true;
    if (user._source === 'mock' && currentUser?.username === user.username) return true;
    return false;
  }, [user, session?.user?.id, currentUser?.username]);

  const handleFollowToggle = useCallback(async () => {
    if (!user || user._source !== 'supabase') return;
    if (isOwner) return;
    if (!session?.user?.id) {
      navigate('/login', { state: { from: `/profile/${user.username}` } });
      return;
    }
    setFollowBusy(true);
    setFollowError('');
    const wasFollowing = following;
    const prevFollowers = user.followers;
    const next = !wasFollowing;
    try {
      await setFollowTarget(user.id, next);
      setFollowing(next);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              followers: Math.max(0, prevFollowers + (next ? 1 : -1)),
            }
          : prev,
      );
    } catch (e) {
      setFollowing(wasFollowing);
      setUser((prev) => (prev ? { ...prev, followers: prevFollowers } : prev));
      const code = e?.code ?? e?.cause?.code;
      if (
        code === 'SIGN_IN_REQUIRED'
        || e?.message === 'Sign in to follow creators.'
      ) {
        navigate('/login', { state: { from: `/profile/${user.username}` } });
      } else {
        setFollowError(e?.message || 'Could not update follow.');
      }
    } finally {
      setFollowBusy(false);
    }
  }, [user, session?.user?.id, following, isOwner, navigate]);

  const template = normalizePortfolioTemplate(user?.portfolio_template);
  const site = user ? websiteHref(user.website) : '';
  const boldDiscipline =
    user?.tags?.[0] || user?.artworks?.[0]?.category || '';

  const handleDeleteWork = useCallback(async (artwork) => {
    if (!user || user._source !== 'supabase') return;
    if (
      !window.confirm(
        `Remove “${artwork.title}” from your portfolio? This cannot be undone.`,
      )
    ) {
      return;
    }
    setWorkDeleteError('');
    try {
      await deletePortfolioItemForCurrentUser(artwork.id, artwork.storage_path);
      setUser((prev) => {
        if (!prev) return prev;
        const nextArtworks = prev.artworks.filter((a) => a.id !== artwork.id);
        const tags = [...new Set(nextArtworks.map((i) => i.category).filter(Boolean))].slice(
          0,
          8,
        );
        return { ...prev, artworks: nextArtworks, tags };
      });
    } catch (e) {
      setWorkDeleteError(e.message || 'Could not delete that work.');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="profile-loading" role="status">
        Loading profile…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-not-found">
        <h2>User not found</h2>
        <p>
          The profile <strong>@{username}</strong> doesn&apos;t exist.
        </p>
        <Link to="/explore" className="btn-primary">Browse artists</Link>
      </div>
    );
  }

  const onDeleteWork =
    isOwner && user._source === 'supabase' ? handleDeleteWork : undefined;

  return (
    <div className={`profile profile--tpl-${template}`}>
      <div
        className="profile-cover"
        style={{
          background: user.cover_image_url ? '#0a0a0f' : user.coverColor,
          backgroundImage: user.cover_image_url ? `url(${user.cover_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!user.cover_image_url && (
          <div className="profile-cover-artworks">
            {user.artworks.slice(0, 5).map((art, i) => (
              <div
                key={art.id}
                className="cover-art-strip"
                style={{
                  '--i': i,
                  backgroundColor: art.color,
                  ...(art.mediaUrl
                    ? {
                        backgroundImage: `url(${art.mediaUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {}),
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="profile-header-section">
        <div className="profile-header-inner">
          <div
            className="profile-avatar"
            style={{ background: user.avatar_url ? 'transparent' : user.avatarColor }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="profile-avatar-img" />
            ) : (
              user.initials
            )}
          </div>
          <div className="profile-meta">
            <div className="profile-name-row">
              <h1
                className={`profile-name${template === 'bold' ? ' profile-name--bold-pdf' : ''}`}
              >
                {template === 'bold' ? user.name.toUpperCase() : user.name}
                {template === 'bold' && (
                  <span className="profile-name-period" aria-hidden>
                    {' '}
                    .
                  </span>
                )}
              </h1>
              {isOwner ? (
                <Link to="/onboarding" className="btn-edit">Edit portfolio</Link>
              ) : user._source === 'supabase' ? (
                <button
                  type="button"
                  className={`btn-follow${following ? ' following' : ''}`}
                  onClick={() => void handleFollowToggle()}
                  disabled={followBusy}
                >
                  {followBusy ? '…' : following ? 'Following ✓' : 'Follow'}
                </button>
              ) : (
                <button type="button" className="btn-follow" disabled>
                  Follow
                </button>
              )}
            </div>
            {followError && (
              <p className="profile-follow-error" role="alert">
                {followError}
              </p>
            )}
            {template === 'bold' ? (
              <>
                {(boldDiscipline || user.location) && (
                <p className="profile-bold-kicker">
                  {boldDiscipline && (
                    <span className="profile-bold-kicker__discipline">
                      {boldDiscipline.toUpperCase()}
                    </span>
                  )}
                  {user.location && (
                    <span className="profile-bold-kicker__loc">
                      {boldDiscipline ? '\u00A0' : ''}
                      {user.location.toUpperCase()}
                    </span>
                  )}
                </p>
                )}
                <p className="profile-username profile-username--below-kicker">
                  @{user.username}
                </p>
                <p className="profile-bio profile-bio--bold-pdf">
                  <span className="profile-about-label">ABOUT:</span>
                  {' '}
                  {user.bio}
                </p>
              </>
            ) : (
              <>
                <p className="profile-username">@{user.username}</p>
                <p className="profile-bio">{user.bio}</p>
              </>
            )}

            {template !== 'bold' && (
            <div className="profile-details">
              {user.location && (
                <span className="profile-detail">
                  <span>📍</span> {user.location}
                </span>
              )}
              {user.website && (
                <a href={site} target="_blank" rel="noreferrer" className="profile-detail profile-website">
                  <span>🌐</span> {user.website}
                </a>
              )}
            </div>
            )}

            {template === 'bold' && (user.location || user.website) && (
            <div className="profile-details profile-details--bold-inline">
              {user.location && (
                <span className="profile-detail">
                  <span className="profile-detail-label">BASED IN</span> {user.location}
                </span>
              )}
              {user.website && (
                <a href={site} target="_blank" rel="noreferrer" className="profile-detail profile-website">
                  <span className="profile-detail-label">WEB</span> {user.website}
                </a>
              )}
            </div>
            )}

            {template !== 'bold' && (
            <div className="profile-tags">
              {user.tags.map((tag) => (
                <span key={tag} className="profile-tag">{tag}</span>
              ))}
            </div>
            )}

            <div className={`profile-stats${template === 'bold' ? ' profile-stats--bold' : ''}`}>
              <div className="profile-stat">
                <span className="profile-stat-value">{user.artworks.length}</span>
                <span className="profile-stat-label">Works</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{user.followers.toLocaleString()}</span>
                <span className="profile-stat-label">Followers</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{user.following.toLocaleString()}</span>
                <span className="profile-stat-label">Following</span>
              </div>
            </div>
          </div>
        </div>
        {template === 'bold' && (
          <div className="profile-bold-footer" aria-label="Contact">
            {user.website && (
              <a href={site} target="_blank" rel="noreferrer" className="profile-bold-footer__cta">
                GET IN TOUCH
              </a>
            )}
            <button
              type="button"
              className="profile-bold-footer__cta profile-bold-footer__cta--ghost"
              onClick={() => setActiveTab('about')}
            >
              ABOUT THE ARTIST
            </button>
          </div>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-content-inner">
          <div className="profile-tabs">
            <button
              type="button"
              className={`profile-tab${activeTab === 'works' ? ' active' : ''}`}
              onClick={() => setActiveTab('works')}
            >
              Works
            </button>
            <button
              type="button"
              className={`profile-tab${activeTab === 'about' ? ' active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
          </div>

          {workDeleteError && activeTab === 'works' && (
            <p className="profile-work-delete-error" role="alert">
              {workDeleteError}
            </p>
          )}

          {activeTab === 'works' && (
            <PortfolioWorksSection
              template={template}
              user={user}
              username={user.username}
              isOwner={isOwner}
              onDeleteWork={onDeleteWork}
            />
          )}

          {activeTab === 'about' && (
            <div className="profile-about">
              <div className="about-section">
                <h3>About {user.name}</h3>
                <p>{user.bio}</p>
              </div>
              {user.location && (
                <div className="about-section">
                  <h4>Location</h4>
                  <p>📍 {user.location}</p>
                </div>
              )}
              {user.website && (
                <div className="about-section">
                  <h4>Website</h4>
                  <a href={site} target="_blank" rel="noreferrer">
                    🌐 {user.website}
                  </a>
                </div>
              )}
              <div className="about-section">
                <h4>Disciplines</h4>
                <div className="profile-tags">
                  {user.tags.map((tag) => (
                    <span key={tag} className="profile-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
