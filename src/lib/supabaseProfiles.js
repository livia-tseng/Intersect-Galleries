import { supabase } from './supabase';
import { getPortfolioPublicUrl } from './storage';
import {
  coverColorFromSeed,
  initialsFromName,
  stringToColor,
} from './userDisplay';
import { normalizePortfolioTemplate } from './portfolioTemplate';

function readFollowBatchMap(batch, id, which) {
  const m = batch?.[which];
  if (!m || typeof m !== 'object') return 0;
  const v = m[id] ?? m[String(id)];
  return typeof v === 'number' ? v : Number(v) || 0;
}

export async function fetchProfileByUsername(username, viewerId = null) {
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

  const { data: batchRaw, error: batchErr } = await supabase.rpc('follow_stats_batch', {
    ids: [profile.id],
  });
  if (batchErr) console.warn('follow_stats_batch', batchErr);

  const batch = batchRaw || { followers: {}, following: {} };
  const fid = profile.id;
  const followers = readFollowBatchMap(batch, fid, 'followers');
  const followingCount = readFollowBatchMap(batch, fid, 'following');

  let viewerFollows = false;
  if (viewerId && viewerId !== profile.id) {
    const { data: rel } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('following_id', profile.id)
      .maybeSingle();
    viewerFollows = !!rel;
  }

  return {
    profile,
    items: items ?? [],
    stats: {
      followers,
      following: followingCount,
      viewerFollows,
    },
  };
}

export function mapProfileRowsToViewModel(profile, items, stats = {}) {
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
    followers: stats.followers ?? 0,
    following: stats.following ?? 0,
    artworks,
    tags,
    portfolio_template: normalizePortfolioTemplate(profile.portfolio_template),
    onboarding_complete: profile.onboarding_complete,
    _source: 'supabase',
  };
}

/** Delete a portfolio item you own; removes DB row and storage object. */
export async function deletePortfolioItemForCurrentUser(itemId, storagePath) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('You must be signed in.');

  const { error: delErr } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', session.user.id);

  if (delErr) throw delErr;

  if (storagePath) {
    const { error: stErr } = await supabase.storage
      .from('portfolio')
      .remove([storagePath]);
    if (stErr) console.warn('Storage delete:', stErr);
  }
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

  const { data: batchRaw, error: batchErr } = await supabase.rpc('follow_stats_batch', {
    ids,
  });
  if (batchErr) console.warn('follow_stats_batch', batchErr);
  const batch = batchRaw || { followers: {}, following: {} };

  return data.map((profile) => {
    const items = (byUser.get(profile.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const fid = profile.id;
    const stats = {
      followers: readFollowBatchMap(batch, fid, 'followers'),
      following: readFollowBatchMap(batch, fid, 'following'),
    };
    return mapProfileRowsToViewModel(profile, items, stats);
  });
}

/**
 * Follow or unfollow a profile (current user is follower). Requires auth + applies RLS.
 */
export async function setFollowTarget(followingProfileId, shouldFollow) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    const err = new Error('Sign in to follow creators.');
    err.code = 'SIGN_IN_REQUIRED';
    throw err;
  }
  const followerId = session.user.id;
  if (followerId === followingProfileId) {
    throw new Error('Cannot follow yourself.');
  }

  if (shouldFollow) {
    const { error } = await supabase.from('follows').insert({
      follower_id: followerId,
      following_id: followingProfileId,
    });
    if (error) {
      if (error.code === '23505') return;
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingProfileId);
    if (error) throw error;
  }
}
