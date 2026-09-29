// Creates (once per local day) the personalised plan for a learner.
import { dateInZone } from './dates.js';
import { makePlan } from './plan.js';

export async function ensurePlan(store, user, state, { courses, topics, papers, feedItems = [], now = new Date(), force = false }) {
  const date = dateInZone(now, user.tz || 'UTC');
  if (!force) {
    const existing = await store.getPlan(user.id, date);
    if (existing) return { plan: existing, created: false, date };
  }
  const plan = makePlan({ state, courses, topics, papers, newPapers: feedItems, date });
  await store.putPlan(user.id, plan);
  return { plan, created: true, date };
}
