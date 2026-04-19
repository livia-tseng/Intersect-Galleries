import { supabase } from './supabase';
import { getPortfolioPublicUrl } from './storage';
import {
  coverColorFromSeed,
  initialsFromName,
  stringToColor,
} from './userDisplay';
import { normalizePortfolioTemplate } from './portfolioTemplate';

export async function fetchProfileByUsername(username) {
  const u = String(username).toLowerCase().trim();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', u)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const { data: items, error: itemsError } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('user_id', profile.id)
    .order('sort_order', { ascending: true });

  if (itemsError) throw itemsError;

  return { profile, items: items ?? [] };
}

export function mapProfileRowsToViewModel(profile, items) {
  const list = items ?? [];
  const artworks = list.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    color: stringToColor(row.id),
    likes: 0,
    year: new Date(row.created_at).getFullYear(),
    media_type: row.media_type,
    storage_path: row.storage_path,
    mediaUrl: getPortfolioPublicUrl(row.storage_path),
  }));

  const tags = [...new Set(list.map((i) => i.category).filter(Boolean))].slice(
    0,
    8,
  );

  return {
    id: profile.id,
    username: profile.username,
    name: profile.display_name,
    bio:
      profile.bio?.trim() ||
      'Creative professional sharing my work on Intersect.',
    avatar: null,
    avatarColor: stringToColor(profile.id),
    initials: initialsFromName(profile.display_name),
    coverColor: coverColorFromSeed(profile.id),
    cover_image_url: profile.cover_image_url,
    avatar_url: profile.avatar_url,
    location: profile.location || '',
    website: profile.website || '',
    followers: 0,
    following: 0,
    artworks,
    tags,
    portfolio_template: normalizePortfolioTemplate(profile.portfolio_template),
    onboarding_complete: profile.onboarding_complete,
    _source: 'supabase',
  };
}

export async function fetchProfilesForExplore(limit = 48) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_complete', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  if (!data?.length) return [];

  const ids = data.map((p) => p.id);
  const { data: allItems, error: itemsError } = await supabase
    .from('portfolio_items')
    .select('*')
    .in('user_id', ids);

  if (itemsError) {
    console.error(itemsError);
    return [];
  }

  const byUser = new Map();
  for (const row of allItems ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  return data.map((profile) => {
    const items = (byUser.get(profile.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    return mapProfileRowsToViewModel(profile, items);
  });
}
