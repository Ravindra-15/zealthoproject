/**
 * CUSTOMER MODULE — Body Profile progress
 * How much of the body profile is filled, per wizard step.
 * Works on the profile from GET /customer/body-profile (or null) and this
 * program's points (utils/bodyProfileConfig.js — the super admin sets them;
 * without settings it's the old 27-point list).
 *
 * The wizard's number sliders start at 0, so a 0 reading ("0 mg/dL",
 * BMI 0, "0 L/day") means "not answered yet" — no real reading is 0.
 */

import {
  activeSteps,
  defaultBodyProfileConfig,
  formatAnswer,
  isAnswered,
  readAnswer,
} from "./bodyProfileConfig";

export { isAnswered };

/**
 * @returns {{
 *   steps: Array<{id, title, filled, total, done, groups: Array<{title, items: Array<{key, label, answered, value}>}>}>,
 *   filled: number, total: number, percent: number,
 *   isDone: boolean, nextStep: number, started: boolean
 * }}
 */
export const getBodyProfileProgress = (profile, config = defaultBodyProfileConfig()) => {
  const steps = activeSteps(config).map((step) => {
    const groups = step.sections.map((g) => ({
      title: g.title,
      items: g.points.map((p) => {
        const raw = readAnswer(profile, p.key);
        const answered = isAnswered(raw);
        return {
          key: p.key,
          label: p.label,
          answered,
          value: answered ? formatAnswer(p, raw) : null,
        };
      }),
    }));
    const items = groups.flatMap((g) => g.items);
    const filled = items.filter((i) => i.answered).length;
    return { id: step.id, title: step.title, groups, filled, total: items.length, done: filled === items.length };
  });

  const total = steps.reduce((n, s) => n + s.total, 0);
  const filled = steps.reduce((n, s) => n + s.filled, 0);
  // floor → never shows 100% while something is still missing
  const percent = total ? Math.floor((filled * 100) / total) : 0;

  return {
    steps,
    filled,
    total,
    percent,
    // complete only when every point is answered —
    // pressing "Done" in the wizard with points still empty doesn't count
    isDone: filled === total,
    // where "Complete Profile" should open the wizard
    nextStep: (steps.find((s) => !s.done) || steps[0])?.id || 1,
    started: filled > 0,
  };
};
