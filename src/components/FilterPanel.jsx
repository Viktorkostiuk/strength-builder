import React from 'react';

const MUSCLES = [
  'abs','quadriceps','glutes','hamstrings',
  'chest','back','lower_back','triceps',
  'shoulders','calves','biceps',
];

const MUSCLE_COLORS = {
  abs:'#f472b6', quadriceps:'#60a5fa', glutes:'#a78bfa',
  hamstrings:'#34d399', chest:'#fb923c', back:'#38bdf8',
  lower_back:'#facc15', triceps:'#c084fc', shoulders:'#4ade80',
  calves:'#f87171', biceps:'#a3e635',
};

export default function FilterPanel({ params, onChange, onBuild, onRefreshRules, rulesStatus, poolSize }) {
  const set = (key, val) => onChange({ ...params, [key]: val });

  const toggleSet = (key, val) => {
    const next = new Set(params[key]);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    set(key, next);
  };

  const bmi = params.bmiValue;
  const bmiCategory =
    bmi < 18.5 ? { label: 'Underweight', color: '#60a5fa' } :
    bmi < 25   ? { label: 'Normal',       color: '#4ade80' } :
    bmi < 30   ? { label: 'Overweight',   color: '#facc15' } :
                 { label: 'Obese',        color: '#f87171' };

  return (
    <div className="filter-panel">
      <div className="panel-title">Parameters</div>

      {/* BMI */}
      <div className="field-group">
        <label className="field-label">BMI</label>
        <div className="bmi-row">
          <input
            type="number" min="10" max="60" step="0.1"
            className="bmi-input"
            value={params.bmiValue}
            onChange={e => set('bmiValue', parseFloat(e.target.value) || 0)}
          />
          <span className="bmi-badge" style={{ color: bmiCategory.color, borderColor: bmiCategory.color + '44' }}>
            {bmiCategory.label}
          </span>
        </div>
      </div>

      {/* Gender */}
      <div className="field-group">
        <label className="field-label">Gender</label>
        <div className="btn-group">
          {['male','female'].map(g => (
            <button key={g}
              className={`toggle-btn ${params.gender === g ? 'active' : ''}`}
              onClick={() => set('gender', g)}>
              {g === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Fitness Level */}
      <div className="field-group">
        <label className="field-label">Fitness Level</label>
        <div className="btn-group">
          {['beginner','intermediate','advanced'].map(l => (
            <button key={l}
              className={`toggle-btn ${params.fitnessLevel === l ? 'active' : ''}`}
              onClick={() => set('fitnessLevel', l)}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
        {params.fitnessLevel === 'beginner' && (
          <label className="check-row small">
            <input type="checkbox" checked={params.strictBeginner}
              onChange={e => set('strictBeginner', e.target.checked)} />
            Strict (Level 1–2 only, mets ≤ 4.8)
          </label>
        )}
      </div>

      {/* Equipment */}
      <div className="field-group">
        <label className="field-label">Equipment</label>
        <div className="check-grid">
          {[['bodyweight','No equipment'],['weights','Weights'],['machines','Machines'],['resistance','Resistance bands']].map(([k,label]) => (
            <label key={k} className="check-row">
              <input type="checkbox" checked={params.equipment.has(k)}
                onChange={() => toggleSet('equipment', k)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Workout Type */}
      <div className="field-group">
        <label className="field-label">Workout Type</label>
        <div className="btn-group">
          {['strength','cardio','mixed'].map(t => (
            <button key={t}
              className={`toggle-btn ${params.workoutType === t ? 'active' : ''}`}
              onClick={() => set('workoutType', t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="field-group">
        <label className="field-label">Duration — <span className="field-value">{params.durationMin} min</span></label>
        <input type="range" min="10" max="60" step="5"
          className="slider"
          value={params.durationMin}
          onChange={e => set('durationMin', parseInt(e.target.value))} />
        <div className="slider-ticks">
          {[10,20,30,45,60].map(v => <span key={v}>{v}</span>)}
        </div>
      </div>

      {/* Target Muscles */}
      <div className="field-group">
        <label className="field-label">Target Muscles <span className="optional">(all if empty)</span></label>
        <div className="muscle-grid">
          {MUSCLES.map(m => {
            const active = params.targetMuscles.has(m);
            const color = MUSCLE_COLORS[m] || '#94a3b8';
            return (
              <button key={m}
                className={`muscle-btn ${active ? 'active' : ''}`}
                style={active ? { background: color + '22', borderColor: color, color } : {}}
                onClick={() => toggleSet('targetMuscles', m)}>
                {m.replace('_',' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Health Concerns */}
      <div className="field-group">
        <label className="field-label">Health Concerns <span className="optional">(exclude risky exercises)</span></label>
        <div className="check-grid">
          {[['knee','Knee injury'],['ankle','Ankle injury'],['hip','Hip injury'],
            ['shoulder','Shoulder injury'],['back','Back pain'],['cvd','CVD / Heart']].map(([k,label]) => (
            <label key={k} className="check-row">
              <input type="checkbox" checked={params.injuries.has(k)}
                onChange={() => toggleSet('injuries', k)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className={`pool-info ${poolSize === 0 ? 'none' : (poolSize !== null && poolSize < 15) ? 'low' : ''}`}>
        {poolSize !== null && (
          poolSize === 0
            ? <span>No exercises match — relax your filters</span>
            : <span>{poolSize} exercises match filters{poolSize < 15 ? ' — small pool' : ''}</span>
        )}
      </div>

      <button className="build-btn" onClick={onBuild} disabled={poolSize === 0}>
        ⚡ Build Workout
      </button>

      <button
        className={`rules-btn ${rulesStatus || ''}`}
        onClick={onRefreshRules}
        disabled={rulesStatus === 'loading'}
      >
        {rulesStatus === 'loading' && '⏳ Loading…'}
        {rulesStatus === 'ok'      && '✓ Rules applied'}
        {rulesStatus === 'error'   && '✗ WORKOUT_RULES.md not found'}
        {!rulesStatus              && '↺ Refresh Rules'}
      </button>
    </div>
  );
}
