import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { users, categories } from '../data/mockData';
import { fetchProfilesForExplore } from '../lib/supabaseProfiles';
import ArtworkCard from '../components/ArtworkCard/ArtworkCard';
import MasonryGrid from '../components/MasonryGrid/MasonryGrid';
import './Home.css';
import './Explore.css';

/** Smooth ease-out for scroll-reveal cards (single tween, no competing durations) */
const exploreCardEase = [0.22, 1, 0.36, 1];

function exploreCardTransition(index, stagger = 0.045) {
  return {
    type: 'tween',
    duration: 0.58,
    ease: exploreCardEase,
    delay: index * stagger,
  };
}

function artistCoverUrl(user) {
  if (user.cover_image_url) return user.cover_image_url;
  const art = user.artworks?.find((a) => a.mediaUrl);
  return art?.mediaUrl ?? null;
}

function artistDiscipline(user) {
  return user.tags?.[0] || user.artworks?.[0]?.category || 'Artist';
}

export default function Explore() {
  const [activeTab, setActiveTab] = useState('artists');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [remoteUsers, setRemoteUsers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchProfilesForExplore(60).then((list) => {
      if (!cancelled) setRemoteUsers(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mergedUsers = useMemo(() => {
    const seen = new Set(
      remoteUsers.map((u) => String(u.username).toLowerCase()),
    );
    const fromMock = users.filter(
      (u) => !seen.has(String(u.username).toLowerCase()),
    );
    return [...remoteUsers, ...fromMock];
  }, [remoteUsers]);

  const allArtworks = useMemo(() => {
    return mergedUsers.flatMap((user) =>
      user.artworks.map((art) => ({
        ...art,
        artistName: user.name,
        username: user.username,
        userId: user.id,
      })),
    );
  }, [mergedUsers]);

  const filteredUsers = useMemo(() => {
    return mergedUsers.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q) ||
        u.tags.some((t) => t.toLowerCase().includes(q));
      const matchesCategory =
        activeCategory === 'All' || u.tags.some((t) => t === activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [mergedUsers, searchQuery, activeCategory]);

  const filteredArtworks = useMemo(() => {
    return allArtworks.filter((art) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.artistName.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === 'All' || art.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allArtworks, searchQuery, activeCategory]);

  return (
    <div className="explore-page">
      <section className="all-artists-section explore-all">
        <div className="demo-wrap">
          <motion.div
            className="section-intro explore-intro"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2>EXPLORE</h2>
            <p>Browse the complete collection — discover artists and artworks</p>
          </motion.div>

          <div className="explore-toolbar">
            <div className="explore-search">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search artists, artworks, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button type="button" className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="explore-tabs">
              <button
                type="button"
                className={`explore-tab${activeTab === 'artists' ? ' active' : ''}`}
                onClick={() => setActiveTab('artists')}
              >
                Artists
                <span className="tab-count">{filteredUsers.length}</span>
              </button>
              <button
                type="button"
                className={`explore-tab${activeTab === 'artworks' ? ' active' : ''}`}
                onClick={() => setActiveTab('artworks')}
              >
                Artworks
                <span className="tab-count">{filteredArtworks.length}</span>
              </button>
            </div>

            <div className="category-filters">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`category-pill${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'artists' && (
            filteredUsers.length > 0 ? (
              <div className="all-grid">
                {filteredUsers.map((user, index) => {
                  const coverUrl = artistCoverUrl(user);
                  return (
                    <motion.article
                      key={String(user.id)}
                      className="all-card"
                      initial={{ opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '0px 0px -12% 0px', amount: 0.12 }}
                      transition={exploreCardTransition(index, 0.06)}
                    >
                      <Link to={`/profile/${user.username}`} className="all-card-link">
                        <motion.div
                          className="all-image-wrap"
                          whileHover={{ scale: 0.97 }}
                          transition={{ duration: 0.5 }}
                        >
                          {coverUrl ? (
                            <img src={coverUrl} alt="" className="all-image" />
                          ) : (
                            <div
                              className="all-image all-image--fallback"
                              style={{ background: user.coverColor }}
                              aria-hidden
                            />
                          )}
                        </motion.div>
                        <div className="all-meta">
                          <h4>{user.name}</h4>
                          <p>{artistDiscipline(user)}</p>
                        </div>
                      </Link>
                    </motion.article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">🎨</p>
                <p className="empty-text">No artists match your search.</p>
              </div>
            )
          )}

          {activeTab === 'artworks' && (
            filteredArtworks.length > 0 ? (
              <MasonryGrid
                className="explore-artwork-grid"
                gap="clamp(1.75rem, 3vw, 3rem)"
                minColumnWidth={280}
              >
                {filteredArtworks.map((art, index) => (
                  <motion.div
                    key={`${art.userId}-${art.id}`}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -12% 0px', amount: 0.12 }}
                    transition={exploreCardTransition(index, 0.04)}
                  >
                    <ArtworkCard
                      artwork={art}
                      artistName={art.artistName}
                      username={art.username}
                    />
                  </motion.div>
                ))}
              </MasonryGrid>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">🖼️</p>
                <p className="empty-text">No artworks match your search.</p>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
