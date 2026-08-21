/**
 * Core workout builder logic.
 * Rules applied from public/WORKOUT_RULES.md
 */

export function calcDuration(mets, isStatic, isUnilateral) {
  let dur;
  if (isStatic)        dur = mets >= 4 ? 30 : 45;
  else if (mets < 3)   dur = 90;
  else if (mets < 3.5) dur = 75;
  else if (mets < 4)   dur = 60;
  else if (mets < 4.5) dur = 50;
  else                 dur = 40;
  if (isUnilateral) dur = Math.max(20, Math.floor(dur / 2));
  return dur;
}

/**
 * Identifies stretching/cooldown exercises.
 * Covers both `cool_down: true` AND exercises whose names contain "stretch"
 * but are NOT tagged as training exercises (DB inconsistency — 70 such exercises).
 */
function isStretchExercise(e) {
  return e.cool_down || (!e.training && /stretch/i.test(e.name));
}

const MUSCLE_ORDER_FULL = [
  'abs', 'quadriceps', 'glutes', 'hamstrings',
  'chest', 'back', 'lower_back', 'triceps',
  'shoulders', 'calves', 'biceps',
];
const MUSCLE_ORDER_UPPER  = ['chest', 'back', 'shoulders', 'triceps', 'biceps', 'abs'];
const MUSCLE_ORDER_LOWER  = ['quadriceps', 'glutes', 'hamstrings', 'calves', 'lower_back', 'abs'];
const MUSCLE_ORDER_CARDIO = ['abs', 'quadriceps', 'glutes', 'hamstrings', 'chest', 'back', 'shoulders', 'calves'];

const UPPER_MUSCLES = new Set(['chest', 'back', 'shoulders', 'triceps', 'biceps', 'trapezius']);
const LOWER_MUSCLES = new Set(['quadriceps', 'glutes', 'hamstrings', 'calves', 'lower_back']);

export const DEFAULT_RULES = {
  stretchingAtEndsOnly: true,
  beginnerMaxMets: 4.8,
  intermediateMaxMets: 7.0,
  advancedMaxMets: 12.0,
  maxUniqueExercises: 12,
  maxSetsPerExercise: 4,
  maxPerMuscleBeginner: 3,
  maxPerMuscleAdvanced: 4,
  absUncapped: true,
  transitionSec: 10,
  maxStretchesPerWorkout: 2,
  maxStretchesCardio: 3,
  compoundFirst: true,
  noConsecutiveSameMuscle: true,
  allowPlyometricForBeginner: false,
  cvdMaxMets: 6.0,
  cvdNoPlyometric: true,
  durationCapMap: { 15: 1, 30: 2, 45: 3, 60: 4 },
  // Rest time between exercises
  restTimeBeginner_strength: 60,
  restTimeBeginner_cardio: 30,
  restTimeDefault: 30,
};

// Lightweight pool size for live preview
export function getPoolSize(exercises, params, rulesOverride = {}) {
  const rules = { ...DEFAULT_RULES, ...rulesOverride };
  const { fitnessLevel, equipment, injuries, workoutType, strictBeginner } = params;
  return exercises.filter(e => {
    const hasEquip =
      (equipment.has('bodyweight') && e.bodyweight) ||
      (equipment.has('weights')    && e.weights)    ||
      (equipment.has('machines')   && e.machines)   ||
      (equipment.has('resistance') && e.resistance);
    if (!hasEquip) return false;
    if (fitnessLevel === 'beginner') {
      if (strictBeginner && !e.level1 && !e.level2) return false;
      if (!strictBeginner && !e.beginner) return false;
      if (e.mets > rules.beginnerMaxMets) return false;
      if (!rules.allowPlyometricForBeginner && e.plyometric) return false;
    } else if (fitnessLevel === 'intermediate') {
      if (!e.beginner && !e.intermediate) return false;
      if (e.mets > rules.intermediateMaxMets) return false;
    } else {
      if (!e.advanced) return false;
    }
    if (injuries.has('knee')     && e.knee)         return false;
    if (injuries.has('ankle')    && e.ankle)        return false;
    if (injuries.has('hip')      && e.hip)          return false;
    if (injuries.has('shoulder') && e.shoulder_inj) return false;
    if (injuries.has('back')     && e.back_pain)    return false;
    if (injuries.has('cvd')      && e.cvd)          return false;
    if (injuries.has('cvd')      && e.mets > rules.cvdMaxMets) return false;
    if (injuries.has('cvd')      && rules.cvdNoPlyometric && e.plyometric) return false;
    if (workoutType === 'strength' && e.cardio && !e.strength_set) return false;
    if (workoutType === 'cardio'   && !e.cardio) return false;
    return true;
  }).length;
}

export function buildWorkout(exercises, params, rulesOverride = {}) {
  const rules = { ...DEFAULT_RULES, ...rulesOverride };

  const {
    fitnessLevel, equipment, injuries,
    targetMuscles, workoutType, durationMin, strictBeginner,
  } = params;

  const targetSec       = durationMin * 60;
  const TRANSITION      = rules.transitionSec;
  const MAX_UNIQUE      = rules.maxUniqueExercises ?? 12;
  const MAX_SETS        = rules.maxSetsPerExercise ?? 4;
  const MUSCLE_CAP_BEG  = rules.maxPerMuscleBeginner ?? 3;
  const MUSCLE_CAP_ADV  = rules.maxPerMuscleAdvanced ?? 4;
  const isCardio        = workoutType === 'cardio';

  // Rest time added after every exercise (included in duration budget)
  const REST_SEC = fitnessLevel === 'beginner'
    ? (isCardio ? (rules.restTimeBeginner_cardio ?? 30) : (rules.restTimeBeginner_strength ?? 60))
    : (rules.restTimeDefault ?? 30);
  // Total gap between exercises = rest + small transition for setup
  const GAP = REST_SEC + TRANSITION;

  // When the user targets fewer muscles, scale the per-muscle cap up proportionally
  // so the workout fills the requested duration.
  // Full-body reference = 11 muscle groups. 3 targeted muscles → ~3.7× more per muscle allowed.
  const FULL_BODY_MUSCLES = 11;
  const baseCap     = fitnessLevel === 'beginner' ? MUSCLE_CAP_BEG : MUSCLE_CAP_ADV;
  // muscleOrder isn't computed yet — use targetMuscles.size as proxy (0 = full body)
  const activeMuscleCount = targetMuscles.size > 0 ? targetMuscles.size : FULL_BODY_MUSCLES;
  const scaledCap   = Math.ceil(baseCap * FULL_BODY_MUSCLES / activeMuscleCount);
  const MUSCLE_CAP  = Math.max(baseCap, scaledCap);
  const MAX_STRETCHES   = isCardio
    ? (rules.maxStretchesCardio ?? 3)
    : (rules.maxStretchesPerWorkout ?? 2);

  // ── 1. Filter pool ──────────────────────────────────────────────────
  const pool = exercises.filter(e => {
    const hasEquip =
      (equipment.has('bodyweight') && e.bodyweight) ||
      (equipment.has('weights')    && e.weights)    ||
      (equipment.has('machines')   && e.machines)   ||
      (equipment.has('resistance') && e.resistance);
    if (!hasEquip) return false;

    if (fitnessLevel === 'beginner') {
      if (strictBeginner && !e.level1 && !e.level2) return false;
      if (!strictBeginner && !e.beginner) return false;
      if (e.mets > rules.beginnerMaxMets) return false;
      if (!rules.allowPlyometricForBeginner && e.plyometric) return false;
    } else if (fitnessLevel === 'intermediate') {
      if (!e.beginner && !e.intermediate) return false;
      if (e.mets > rules.intermediateMaxMets) return false;
    } else {
      if (!e.advanced) return false;
      if (e.mets > rules.advancedMaxMets) return false;
    }

    if (injuries.has('knee')     && e.knee)         return false;
    if (injuries.has('ankle')    && e.ankle)        return false;
    if (injuries.has('hip')      && e.hip)          return false;
    if (injuries.has('shoulder') && e.shoulder_inj) return false;
    if (injuries.has('back')     && e.back_pain)    return false;
    if (injuries.has('cvd')      && e.cvd)          return false;
    if (injuries.has('cvd')      && e.mets > rules.cvdMaxMets) return false;
    if (injuries.has('cvd')      && rules.cvdNoPlyometric && e.plyometric) return false;

    if (workoutType === 'strength' && e.cardio && !e.strength_set) return false;
    if (workoutType === 'cardio'   && !e.cardio) return false;

    return true;
  });

  // ── 2. Sort compound-first ──────────────────────────────────────────
  const sorted = rules.compoundFirst
    ? [...pool].sort((a, b) => (b.secondary?.length || 0) - (a.secondary?.length || 0))
    : pool;

  // ── 3. Group by primary muscle + name lookup ────────────────────────
  const byMuscle = {};
  const byName   = {};
  for (const e of sorted) {
    byName[e.name] = e;
    for (const m of (e.primary.length ? e.primary : ['abs'])) {
      if (!byMuscle[m]) byMuscle[m] = [];
      byMuscle[m].push(e);
    }
  }

  // ── 4. Muscle order ─────────────────────────────────────────────────
  let muscleOrder;
  if (targetMuscles.size > 0) {
    const hasUpper = [...targetMuscles].some(m => UPPER_MUSCLES.has(m));
    const hasLower = [...targetMuscles].some(m => LOWER_MUSCLES.has(m));
    const base = (hasUpper && !hasLower) ? MUSCLE_ORDER_UPPER
               : (!hasUpper && hasLower) ? MUSCLE_ORDER_LOWER
               : MUSCLE_ORDER_FULL;
    muscleOrder = base.filter(m => targetMuscles.has(m));
  } else {
    muscleOrder = isCardio ? MUSCLE_ORDER_CARDIO : MUSCLE_ORDER_FULL;
  }
  if (muscleOrder.length === 0) return { exercises: [], totalSec: 0, poolSize: pool.length };

  // ── 5. Fill workout ─────────────────────────────────────────────────
  const exCount        = {};        // name → times placed (for sets)
  const uniqueBaseNames = new Set(); // base names (pairs share one slot toward MAX_UNIQUE)
  const muscleCnt      = {};        // muscle → times placed
  const result         = [];
  let stretchCount = 0;
  let total        = 0;
  let mi           = 0;
  let noProgress   = 0;
  const GIVE_UP    = muscleOrder.length * 6;
  let lastMuscle   = null;

  // Strip (Right)/(Left) to get base name for uniqueness counting
  const baseName = name => name.replace(/\s*\((Right|Left)\)/g, '').trim();

  // Reserve time at end for stretch post-pass (max 45s per stretch + gap)
  const stretchReserve = rules.stretchingAtEndsOnly
    ? MAX_STRETCHES * (45 + GAP)
    : 0;
  const mainFillTarget = targetSec - stretchReserve;

  // Place one exercise into result.
  // durOverride: use this duration instead of calculating (keeps unilateral pairs equal).
  const placeOne = (e, m, durOverride) => {
    const isUni = e.name.includes('(Right)') || e.name.includes('(Left)');
    const dur   = durOverride ?? calcDuration(e.mets, e.static, isUni);
    result.push({ ...e, assignedDuration: dur, restSec: REST_SEC, isUnilateral: isUni, targetMuscle: m });
    exCount[e.name] = (exCount[e.name] || 0) + 1;
    if (!isStretchExercise(e)) uniqueBaseNames.add(baseName(e.name));
    muscleCnt[m] = (muscleCnt[m] || 0) + 1;
    if (isStretchExercise(e)) stretchCount++;
    total += dur + GAP;
    return dur;
  };

  while (total < mainFillTarget && noProgress < GIVE_UP) {
    const m         = muscleOrder[mi % muscleOrder.length];
    const remaining = mainFillTarget - total - GAP;
    if (remaining < 20) break;

    // Muscle cap (abs uncapped)
    const cap = (m === 'abs' && rules.absUncapped) ? Infinity : MUSCLE_CAP;
    if ((muscleCnt[m] || 0) >= cap) { mi++; noProgress++; continue; }

    // No consecutive same muscle (when alternatives exist)
    if (rules.noConsecutiveSameMuscle && m === lastMuscle) {
      const othersLeft = muscleOrder.some(
        x => x !== m && (muscleCnt[x] || 0) < ((x === 'abs' && rules.absUncapped) ? Infinity : MUSCLE_CAP)
      );
      if (othersLeft) { mi++; noProgress++; continue; }
    }

    // Candidate filter
    const candidates = (byMuscle[m] || []).filter(e => {
      const count = exCount[e.name] || 0;
      if (count >= MAX_SETS) return false;
      const bn = baseName(e.name);
      if (uniqueBaseNames.size >= MAX_UNIQUE && !uniqueBaseNames.has(bn)) return false;
      if (rules.stretchingAtEndsOnly && isStretchExercise(e)) return false;
      if (!rules.stretchingAtEndsOnly && isStretchExercise(e) && stretchCount >= MAX_STRETCHES) return false;
      return true;
    });

    const fit = candidates.filter(e => {
      const isUni = e.name.includes('(Right)') || e.name.includes('(Left)');
      const dur   = calcDuration(e.mets, e.static, isUni);
      if (!isUni) return dur <= remaining;
      const otherName = e.name.includes('(Right)')
        ? e.name.replace('(Right)', '(Left)')
        : e.name.replace('(Left)', '(Right)');
      const pair = byName[otherName];
      const pairOk = pair && (exCount[pair.name] || 0) < MAX_SETS;
      return pairOk ? (dur * 2 + GAP) <= remaining : dur <= remaining;
    });

    if (fit.length) {
      const e     = fit[Math.floor(Math.random() * Math.min(fit.length, 3))];
      const isUni = e.name.includes('(Right)') || e.name.includes('(Left)');
      const dur   = placeOne(e, m);

      if (isUni) {
        const otherName = e.name.includes('(Right)')
          ? e.name.replace('(Right)', '(Left)')
          : e.name.replace('(Left)', '(Right)');
        const other = byName[otherName];
        if (other && (exCount[other.name] || 0) < MAX_SETS &&
            total + dur + GAP <= mainFillTarget) {
          placeOne(other, m, dur);
        }
      }

      lastMuscle = m;
      mi++;
      noProgress = 0;
    } else {
      mi++;
      noProgress++;
    }
  }

  // ── 6. Append stretches at the end ──────────────────────────────────
  if (MAX_STRETCHES > 0) {
    const usedStretches = new Set();
    for (const m of muscleOrder) {
      if (stretchCount >= MAX_STRETCHES) break;
      const remaining = targetSec - total - GAP;
      if (remaining < 20) break;

      const stretchCandidates = (byMuscle[m] || []).filter(e =>
        isStretchExercise(e) &&
        !usedStretches.has(e.name) &&
        (exCount[e.name] || 0) < MAX_SETS
      );

      for (const e of stretchCandidates) {
        if (stretchCount >= MAX_STRETCHES) break;
        const isUni = e.name.includes('(Right)') || e.name.includes('(Left)');
        const dur   = calcDuration(e.mets, e.static, isUni);

        const otherName = isUni
          ? (e.name.includes('(Right)') ? e.name.replace('(Right)', '(Left)') : e.name.replace('(Left)', '(Right)'))
          : null;
        const pair = otherName ? byName[otherName] : null;
        const needsBoth = isUni && pair && !usedStretches.has(pair.name);
        const timeNeeded = needsBoth ? dur * 2 + GAP : dur;
        if (total + timeNeeded + GAP > targetSec) continue;

        placeOne(e, m);
        usedStretches.add(e.name);

        if (needsBoth) {
          placeOne(pair, m, dur);
          usedStretches.add(pair.name);
        }
        break;
      }
    }
  }

  // ── 7. Group sets: all sets of each exercise consecutive, stretches last ─
  const nonStretches = result.filter(e => !isStretchExercise(e));
  const stretches    = result.filter(e =>  isStretchExercise(e));

  const orderedNames = [];
  const grouped      = {};
  for (const ex of nonStretches) {
    if (!grouped[ex.name]) { grouped[ex.name] = []; orderedNames.push(ex.name); }
    grouped[ex.name].push(ex);
  }
  const finalResult = [...orderedNames.flatMap(n => grouped[n]), ...stretches];

  return { exercises: finalResult, totalSec: total, poolSize: pool.length, restSec: REST_SEC };
}
