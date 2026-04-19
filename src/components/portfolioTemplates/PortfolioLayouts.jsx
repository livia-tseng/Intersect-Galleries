import ArtworkCard from '../ArtworkCard/ArtworkCard';
import { normalizePortfolioTemplate } from '../../lib/portfolioTemplate';
import './PortfolioLayouts.css';

function artsySpanClass(i) {
  if (i % 4 === 0) return 'portfolio-layout__artsy-cell--wide';
  return '';
}

export function PortfolioWorksSection({ template, user, username, isOwner }) {
  const artistName = user.name;
  const artworks = user.artworks ?? [];
  const tpl = normalizePortfolioTemplate(template || user.portfolio_template);

  const empty = (
    <p className="portfolio-layout__empty">
      Add works from Edit portfolio to fill this layout.
    </p>
  );

  if (tpl === 'artsy') {
    return (
      <div className="portfolio-layout portfolio-layout--artsy">
        {artworks.map((art, i) => (
          <div
            key={art.id}
            className={`portfolio-layout__artsy-cell ${artsySpanClass(i)}`.trim()}
          >
            <ArtworkCard artwork={art} artistName={artistName} username={username} />
          </div>
        ))}
        {isOwner && artworks.length === 0 && empty}
      </div>
    );
  }

  if (tpl === 'bold') {
    if (artworks.length === 0) {
      return (
        <div className="portfolio-layout portfolio-layout--bold">
          <h2 className="portfolio-bold-pdf-heading">
            <span className="portfolio-bold-pdf-heading__line">NAME OF EXHIBITION /</span>
            <span className="portfolio-bold-pdf-heading__line">COLLECTIONS</span>
          </h2>
          <div className="portfolio-layout__bold-accent" aria-hidden />
          {isOwner && empty}
        </div>
      );
    }
    const [first, ...rest] = artworks;
    return (
      <div className="portfolio-layout portfolio-layout--bold">
        <h2 className="portfolio-bold-pdf-heading">
          <span className="portfolio-bold-pdf-heading__line">NAME OF EXHIBITION /</span>
          <span className="portfolio-bold-pdf-heading__line">COLLECTIONS</span>
        </h2>
        <div className="portfolio-layout__bold-accent" aria-hidden />
        <div className="portfolio-layout__bold-hero">
          <ArtworkCard artwork={first} artistName={artistName} username={username} />
        </div>
        {rest.length > 0 && (
          <div className="portfolio-layout__bold-grid">
            {rest.map((art) => (
              <ArtworkCard key={art.id} artwork={art} artistName={artistName} username={username} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* minimalist — aligned with intersect_galleries Figma demo (Maya Chen) */
  if (tpl === 'minimalist') {
    if (artworks.length === 0) {
      return (
        <div className="portfolio-layout portfolio-layout--minimalist">
          {isOwner && empty}
        </div>
      );
    }
    const [lead, ...rest] = artworks;
    return (
      <div className="portfolio-layout portfolio-layout--minimalist">
        <header className="portfolio-minimal-heading">
          <span className="portfolio-minimal-heading__eyebrow">Works</span>
          <h2 className="portfolio-minimal-heading__title">Selected pieces</h2>
        </header>
        <div className="portfolio-layout__minimal-lead">
          <ArtworkCard
            artwork={lead}
            artistName={artistName}
            username={username}
            minimal
          />
        </div>
        {rest.length > 0 && (
          <div className="portfolio-layout__minimal-grid">
            {rest.map((art) => (
              <ArtworkCard
                key={art.id}
                artwork={art}
                artistName={artistName}
                username={username}
                minimal
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="portfolio-layout portfolio-layout--minimalist">
      {artworks.map((art) => (
        <ArtworkCard key={art.id} artwork={art} artistName={artistName} username={username} />
      ))}
      {isOwner && artworks.length === 0 && empty}
    </div>
  );
}
