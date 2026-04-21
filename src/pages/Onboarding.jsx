import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getPortfolioPublicUrl } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import {
  TEMPLATE_OPTIONS,
  normalizePortfolioTemplate,
} from '../lib/portfolioTemplate';
import { categories } from '../data/mockData';
import { ONBOARDING_SAMPLE_USER } from '../data/onboardingPreviewSamples';
import { PortfolioWorksSection } from '../components/portfolioTemplates/PortfolioLayouts';
import './Auth.css';
import './Onboarding.css';

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function isAllowedMedia(file) {
  if (file.type.startsWith('image/')) return true;
  if (file.type === 'video/mp4' || file.type === 'video/webm') return true;
  return false;
}

function mediaTypeFromFile(file) {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

async function uploadToPortfolio(userId, relativePath, file) {
  const path = `${userId}/${relativePath}`;
  const { error } = await supabase.storage.from('portfolio').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user?.id;

  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState(() =>
    normalizePortfolioTemplate(profile?.portfolio_template),
  );

  useEffect(() => {
    if (profile?.portfolio_template != null) {
      setTemplate(normalizePortfolioTemplate(profile.portfolio_template));
    }
  }, [profile?.portfolio_template]);
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [works, setWorks] = useState([
    { key: crypto.randomUUID(), file: null, title: '', category: categories[1] || 'Mixed Media' },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const categoryChoices = useMemo(
    () => categories.filter((c) => c !== 'All'),
    [],
  );

  const validateFiles = (file) => {
    if (!file) return null;
    if (!isAllowedMedia(file)) return 'Use an image or MP4/WebM video.';
    if (file.size > MAX_FILE_BYTES) return 'Each file must be 50MB or smaller.';
    return null;
  };

  const addWorkRow = () => {
    setWorks((w) => [
      ...w,
      { key: crypto.randomUUID(), file: null, title: '', category: categoryChoices[0] || 'Mixed Media' },
    ]);
  };

  const removeWorkRow = (key) => {
    setWorks((w) => (w.length <= 1 ? w : w.filter((row) => row.key !== key)));
  };

  const updateWork = (key, patch) => {
    setWorks((w) => w.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const finish = async () => {
    setError('');
    if (!userId || !profile?.username) {
      setError('Missing session. Log in again.');
      return;
    }

    const avErr = validateFiles(avatarFile);
    if (avErr) {
      setError(avErr);
      return;
    }
    const cvErr = validateFiles(coverFile);
    if (cvErr) {
      setError(cvErr);
      return;
    }

    for (const row of works) {
      if (!row.file) continue;
      const err = validateFiles(row.file);
      if (err) {
        setError(err);
        return;
      }
    }

    setSaving(true);
    try {
      let avatar_url = profile.avatar_url;
      let cover_image_url = profile.cover_image_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const path = await uploadToPortfolio(
          userId,
          `avatar/${crypto.randomUUID()}.${ext}`,
          avatarFile,
        );
        avatar_url = getPortfolioPublicUrl(path);
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const path = await uploadToPortfolio(
          userId,
          `cover/${crypto.randomUUID()}.${ext}`,
          coverFile,
        );
        cover_image_url = getPortfolioPublicUrl(path);
      }

      const websiteClean = website.trim().replace(/^https?:\/\//i, '');

      const templateForDb = normalizePortfolioTemplate(template);

      const { error: upProfError } = await supabase
        .from('profiles')
        .update({
          portfolio_template: templateForDb,
          bio: bio.trim(),
          location: location.trim(),
          website: websiteClean,
          avatar_url,
          cover_image_url,
          onboarding_complete: true,
        })
        .eq('id', userId);

      if (upProfError) throw upProfError;

      const rowsToInsert = [];
      let order = 0;
      for (const row of works) {
        if (!row.file) continue;
        const safeName = row.file.name.replace(/[^\w.-]+/g, '_');
        const storage_path = await uploadToPortfolio(
          userId,
          `items/${crypto.randomUUID()}/${safeName}`,
          row.file,
        );
        rowsToInsert.push({
          user_id: userId,
          title: row.title.trim() || 'Untitled',
          category: row.category || 'Mixed Media',
          media_type: mediaTypeFromFile(row.file),
          storage_path,
          sort_order: order,
        });
        order += 1;
      }

      if (rowsToInsert.length) {
        const { error: insError } = await supabase
          .from('portfolio_items')
          .insert(rowsToInsert);
        if (insError) throw insError;
      }

      await refreshProfile();
      navigate(`/profile/${profile.username}`, { replace: true });
    } catch (e) {
      setError(e.message || 'Could not save. Check Storage policies and your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-page onboarding-page onboarding-page-all">
      <div
        className={`auth-card onboarding-card${step === 0 ? ' onboarding-card--template-step' : ''}`}
      >
        <div className="auth-logo">
          <span className="auth-logo-icon">✦</span>
          <span>Intersect</span>
        </div>
        <h1 className="auth-title">
          {profile?.onboarding_complete ? 'Update your portfolio' : 'Set up your portfolio'}
        </h1>
        <p className="auth-subtitle">
          Step {step + 1} of 3 — @{profile?.username}
        </p>

        {step === 0 && (
          <div className="onboarding-step">
            <p className="onboarding-lead">Choose a layout template. You can change this later.</p>
            <div className="template-grid">
              {TEMPLATE_OPTIONS.map((t) => (
                <div key={t.id} className="template-option">
                  <button
                    type="button"
                    className={`template-card${template === t.id ? ' selected' : ''}`}
                    onClick={() => setTemplate(t.id)}
                    aria-expanded={template === t.id}
                  >
                    <span className="template-name">{t.name}</span>
                    <span className="template-blurb">{t.blurb}</span>
                  </button>
                  {template === t.id && (
                    <div className="template-preview-panel" aria-live="polite">
                      <p className="template-preview-label">Preview — same works, different layout</p>
                      <div className="template-preview-frame">
                        <PortfolioWorksSection
                          template={t.id}
                          user={ONBOARDING_SAMPLE_USER}
                          username="preview"
                          isOwner={false}
                          previewMode
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="auth-submit" onClick={() => setStep(1)}>
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step">
            <div className="form-group">
              <label htmlFor="ob-bio">Bio</label>
              <textarea
                id="ob-bio"
                className="onboarding-textarea"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell visitors about your practice…"
              />
            </div>
            <div className="form-group">
              <label htmlFor="ob-loc">Location</label>
              <input
                id="ob-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div className="form-group">
              <label htmlFor="ob-web">Website</label>
              <input
                id="ob-web"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="yourdomain.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="ob-avatar">Profile photo (optional)</label>
              <input
                id="ob-avatar"
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="ob-cover">Cover image (optional)</label>
              <input
                id="ob-cover"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="onboarding-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep(0)}>
                Back
              </button>
              <button type="button" className="auth-submit onboarding-next" onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <p className="onboarding-lead">
              Add one or more works (optional). Images or MP4/WebM, up to 50MB each.
            </p>
            <div className="works-editor">
              {works.map((row) => (
                <div key={row.key} className="work-row">
                  <div className="form-group">
                    <label>File</label>
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={(e) =>
                        updateWork(row.key, { file: e.target.files?.[0] || null })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => updateWork(row.key, { title: e.target.value })}
                      placeholder="Piece title"
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="onboarding-select"
                      value={row.category}
                      onChange={(e) => updateWork(row.key, { category: e.target.value })}
                    >
                      {categoryChoices.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {works.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-row"
                      onClick={() => removeWorkRow(row.key)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary btn-add-row" onClick={addWorkRow}>
              + Add another work
            </button>
            {error && <p className="form-error">{error}</p>}
            <div className="onboarding-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="auth-submit onboarding-next"
                onClick={finish}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Finish & view profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
