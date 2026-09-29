import { json, withUser } from '../../../lib/http.js';
import { ensurePlan } from '../../../lib/planner.js';
import { normalizeState } from '../../../lib/scoring.js';
import courses from '../../../data/courses.json';
import topicsData from '../../../data/topics.json';
import papers from '../../../data/papers.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The learner's recent plans (today's is created on first open) and the shared new-paper feed.
export const GET = withUser(async ({ store, user }) => {
  const state = normalizeState(await store.getState(user.id));
  const feed = await store.latestFeed();
  await ensurePlan(store, user, state, { courses, topics: topicsData.topics, papers, feedItems: feed ? feed.items : [] });
  const plans = await store.listPlans(user.id, 14);
  return json({ plans, feed: feed ? feed.items : [], feedDate: feed ? feed.date : null });
}, { rate: { name: 'daily', max: 60, windowSec: 600 } });
