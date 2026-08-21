/**
 * Core workout builder logic.
 * Rules applied from WORKOUT_RULES.md
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

// Muscle cycling orders per workout focus
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

// Dynamic per-muscle cap based on target duration (abs always uncapped)
function getMuscleCap(durationMin) {
  if (durationMin <= 15) return 1;
  if (durationMin <= 30) return 2;
  if (durationMin <= 45) return 3;
  return 4;
}

export function buildWorkout(exercises, params) {
  const {
    fitnessLevel,
    equipment,
    injuries,
    targetMuscles,
    workoutType,
    durationMin,
    strictBeginner,
  } = params;

  const targetSec  = durationMin * 60;
  const TRANSITION = 10;
  const MAX_PER_MUSCLE = getMuscleCap(durationMin);

  // ── 1. Filter pool ──────────────────────────────────────────────────
  let pool = exercises.filter(e => {
    const hasEquip =
      (equipment.has('bodyweight') && e.bodyweight) ||
      (equipment.has('weights')    && e.weights)    ||
      (equipment.has('machines')   && e.machines)   ||
      (equipment.has('resistance') && e.resistance);
    if (!hasEquip) return false;

    if (fitnessLevel === 'beginner') {
      if (strictBeginner && !e.level1 && !e.level2) return false;
      if (!strictBeginner && !e.beginner) return false;
      if (e.mets > 4.8) return false;
      if (e.plyometric) return false;
    } else if (fitnessLevel === 'intermediate') {
      if (!e.beginner && !e.intermediate) return false;
    } else {
      if (!e.advanced) return false;
    }

    if (injuries.has('knee')     && e.knee)         return false;
    if (injuries.has('ankle')    && e.ankle)        return false;
    if (injuries.has('hip')      && e.hip)          return false;
    if (injuries.has('shoulder') && e.shoulder_inj) return false;
    if (injuries.has('back')     && e.back_pain)    return false;
    if (injuries.has('cvd')      && e.cvd)          return false;
    if (injuries.has('cvd')      && e.mets > 6)     return false;
    if (injuries.has('cvd')      && e.plyometric)   return false;

    if (workoutType === 'strength' && e.cardio && !e.strength_set) return false;
    if (workoutType === 'cardio'   && !e.cardio) return false;

    return true;
  });

  // ── 2. Sort: compound-first (more secondary muscles = more compound) ──
  pool = [...pool].sort((a, b) => (b.secondary?.length || 0) - (a.secondary?.length || 0));

  // ── 3. Group by primary muscle ──────────────────────────────────────
  const byMuscle = {};
  for (const e of pool) {
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
    muscleOrder = workoutType === 'cardio' ? MUSCLE_ORDER_CARDIO : MUSCLE_ORDER_FULL;
  }
  if (muscleOrder.length === 0) return { exercises: [], totalSec: 0, poolSize: pool.length };

  // ── 5. Fill workout ─────────────────────────────────────────────────
  const used      = new Set();
  const muscleCnt = {};
  const result    = [];
  let total       = 0;
  let mi          = 0;
  // stalls = consecutive failures to place ANY exercise (true pool exhaustion signal)
  // Capped muscles and consecutive-same-muscle skips do NOT count as stalls
  let stalls      = 0;
  let lastMuscle  = null;

  while (total < targetSec && stalls < muscleOrder.length * 2) {
    const m         = muscleOrder[mi % muscleOrder.length];
    const remaining = targetSec - total - TRANSITION;
    if (remaining < 20) break;

    // Skip capped muscles silently — not a stall, just move on
    const cap = m === 'abs' ? Infinity : MAX_PER_MUSCLE;
    if ((muscleCnt[m] || 0) >= cap) { mi++; continue; }

    // Skip consecutive same-muscle silently (only when other muscles are available)
    const othersAvailable = muscleOrder.some(
      other => other !== m && (muscleCnt[other] || 0) < (other === 'abs' ? Infinity : MAX_PER_MUSCLE)
    );
    if (m === lastMuscle && othersAvailable) { mi++; continue; }

    const candidates = (byMuscle[m] || []).filter(e => !used.has(e.name));
    const fit = candidates.filter(e => {
      const isUni = e.name.includes('(Right)') || e.name.includes('(Left)');
      return calcDuration(e.mets, e.static, isUni) <= remaining;
    });

    if (fit.length) {
      const e     = fit[Math.floor(Math.random() * Math.min(fit.length, 3))];
      const isUni = e.name.includes('(Right)') || e.name.includes('(Left)');
      const dur   = calcDuration(e.mets, e.static, isUni);
      result.push({ ...e, assignedDuration: dur, isUnilateral: isUni, targetMuscle: m });
      used.add(e.name);
      muscleCnt[m] = (muscleCnt[m] || 0) + 1;
      total       += dur + TRANSITION;
      lastMuscle   = m;
      mi++;
      stalls = 0;
    } else {
      // This muscle's pool is genuinely exhausted — that's a real stall
      mi++;
      stalls++;
    }
  }

  return { exercises: result, totalSec: total, poolSize: pool.length };
}
