/**
 * SHARED — Body Profile View
 * Presentational: a patient's body profile, laid out with a program's points
 * (set by the super admin; the old 27-point list when never changed).
 * Used by doctor (appointment modal) and admin (user directory).
 *
 * Number answers show their colour band (e.g. "High" in red). Answers that
 * aren't in this program's current list — saved in another program, or for
 * a point that's now hidden — are listed under "Other answers", so nothing
 * the patient told us is ever out of sight.
 */

import { useMemo } from "react";
import { Activity, ClipboardX, Archive } from "lucide-react";

import { SECTION_ICONS } from "../customer/BodyProfile/bodyProfileIcons";
import { useBodyProfileConfigs } from "../../hooks/useBodyProfileConfig";
import {
  BUILT_IN_KEYS,
  defaultBodyProfileConfig,
  findPoint,
  formatAnswer,
  isAnswered,
  parseNum,
  readAnswer,
  visibleSections,
  zoneFor,
} from "../../utils/bodyProfileConfig";
import { PROGRAM_ID } from "../../utils/programConfig";

// Single label + value cell
const Field = ({ point, raw }) => {
  const value = formatAnswer(point, raw);
  const zone = value && point?.type === "range" ? zoneFor(point, parseNum(raw)) : null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold break-words">{point?.label}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <p className="text-sm font-semibold text-gray-900 break-words min-w-0">{value ?? "—"}</p>
        {zone && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ color: zone.color, backgroundColor: `${zone.color}1A` }}
          >
            {zone.label}
          </span>
        )}
      </div>
    </div>
  );
};

// One titled section with icon + grid of fields
const Section = ({ icon, color, title, children }) => {
  const Icon = SECTION_ICONS[icon] || Activity;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1A` }}>
          <Icon size={15} style={{ color }} />
        </div>
        <h3 className="text-sm font-bold text-gray-900 break-words">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
};

// Shown when no profile exists yet
const EmptyState = () => (
  <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
      <ClipboardX size={20} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-700 mb-1">No body profile yet</p>
    <p className="text-xs text-gray-500 max-w-xs mx-auto">
      The patient hasn't completed their body profile yet.
    </p>
  </div>
);

// every answered point on the profile (built-in + added ones)
const answeredKeys = (profile) => {
  const keys = BUILT_IN_KEYS.filter((k) => isAnswered(readAnswer(profile, k)));
  for (const [k, v] of Object.entries(profile?.custom || {})) if (isAnswered(v)) keys.push(`custom.${k}`);
  return keys;
};

/**
 * @param bodyProfile  the patient's profile (or null)
 * @param programId    whose list of points to use (defaults to this app's program)
 */
const BodyProfileView = ({ bodyProfile, programId = PROGRAM_ID }) => {
  const { configs, loading } = useBodyProfileConfigs();
  const config = useMemo(
    () => configs.find((c) => c.programId === programId) || defaultBodyProfileConfig(programId),
    [configs, programId]
  );
  const sections = useMemo(() => visibleSections(config), [config]);

  const others = useMemo(() => {
    if (!bodyProfile) return [];
    const shown = new Set(sections.flatMap((s) => s.points.map((p) => p.key)));
    // name them from this program first, then the others
    const lookIn = [config, ...configs.filter((c) => c.programId !== programId)];
    return answeredKeys(bodyProfile)
      .filter((k) => !shown.has(k))
      .map((k) => ({ key: k, point: findPoint(k, lookIn) || { key: k, label: "Other", type: "choice" } }));
  }, [bodyProfile, sections, config, configs, programId]);

  if (!bodyProfile) return <EmptyState />;

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {sections.map((s) => (
        <Section key={s.key} icon={s.icon} color={s.color} title={s.title}>
          {s.points.map((p) => (
            <Field key={p.key} point={p} raw={readAnswer(bodyProfile, p.key)} />
          ))}
        </Section>
      ))}

      {others.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 flex-shrink-0">
              <Archive size={15} className="text-gray-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900">Other answers</h3>
              <p className="text-[11px] text-gray-500">Saved earlier or in another program — not in this program's current list.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {others.map(({ key, point }) => (
              <Field key={key} point={point} raw={readAnswer(bodyProfile, key)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyProfileView;
