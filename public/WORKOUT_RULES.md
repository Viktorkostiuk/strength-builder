# Workout Generation Rules

Edit this file, then press **↺ Refresh Rules** in the app to apply changes.

---

## Config
<!-- These values are read directly by the app. Format: key: value -->

beginnerMaxMets: 4.8
intermediateMaxMets: 7.0
advancedMaxMets: 12.0

maxUniqueExercises: 12
maxSetsPerExercise: 4
maxPerMuscleBeginner: 3
maxPerMuscleAdvanced: 4
absUncapped: true
transitionSec: 10
maxStretchesPerWorkout: 2
maxStretchesCardio: 3
stretchingAtEndsOnly: true

restTimeBeginner_strength: 60
restTimeBeginner_cardio: 30
restTimeDefault: 30

compoundFirst: true
noConsecutiveSameMuscle: true
allowPlyometricForBeginner: false

cvdMaxMets: 6.0
cvdNoPlyometric: true

obeseBmiThreshold: 30
obeseNoPlyometric: true
obeseNoHighImpact: true

femaleVideosOnly: true

durationCapMap_15: 1
durationCapMap_30: 2
durationCapMap_45: 3
durationCapMap_60: 4

---

## Notes (for reference — app reads Config section above)

### Exercise Selection
- Prefer compound movements over isolation exercises
- Max `maxUniqueExercises` unique exercises per workout. If the workout is long and not enough — start making sets from the first exercise
- If not enough exercises for a muscle group — make sets from previous exercises
- Max `maxSetsPerExercise` sets per single exercise
- Max `maxPerMuscleAdvanced` exercises per muscle group for intermediate/advanced (except abs)
- Max `maxPerMuscleBeginner` exercises per muscle group for beginner (except abs)
- For cardio workouts max `maxStretchesCardio` stretching exercises allowed
- Stretching/warmup/cooldown exercises only at the beginning or end of workouts — never in the middle (`stretchingAtEndsOnly`)
- Never interrupt right/left side exercises — always together

### Rest Time
- After every exercise there is a mandatory rest period
- Beginner + strength: `restTimeBeginner_strength` (default 60s)
- Beginner + cardio: `restTimeBeginner_cardio` (default 30s)
- Intermediate / Advanced: `restTimeDefault` (default 30s)
- Rest time is included in the total workout duration calculation

### Duration & Intensity
- Beginner workouts: max MET `beginnerMaxMets`, no plyometrics
- Static holds: 30–45s depending on intensity
- Dynamic exercises: 40–90s based on MET tiers (lower MET = longer duration)
- Unilateral exercises: halve duration per side, min 20s

### Difficulty Levels
- **Beginner**: Level 1–2 only (strict mode), bodyweight preferred
- **Intermediate**: Level 1–3, all equipment
- **Advanced**: All levels, include plyometrics

### Muscle Balance
- Full body: cycle through abs → quads → glutes → hamstrings → chest → back → shoulders
- Upper body: chest → back → shoulders → triceps → biceps
- Lower body: quads → glutes → hamstrings → calves → lower back

### Health & Safety
- Knee injury: exclude high-impact, deep squat patterns
- Back pain: exclude spinal loading, high-mets core exercises
- CVD: exclude high-intensity cardio (MET > 6), plyometrics
- BMI ≥ `obeseBmiThreshold` (default 30, "Obese" range): exclude plyometrics and high-impact/deep-knee-stress exercises (same exclusion set as knee injury)
- Female gender + `femaleVideosOnly`: only exercises that have a female demo video (~74% of the database)

### Progression for beginners (Challenges)
- Workouts 1–3: 10 min, level 1 only, MET ≤ 3.5
- Workouts 4–6: 12 min, level 1–2, MET ≤ 4.0
- Workouts 7–10: 15 min, level 1–2, MET ≤ 4.8
- No exercise repeats across the full 10-workout challenge
