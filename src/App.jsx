import React, { useState, useMemo, useEffect, useRef } from 'react';
import exercises from './exercises.json';
import FilterPanel from './components/FilterPanel';
import WorkoutResult from './components/WorkoutResult';
import { buildWorkout, getPoolSize } from './utils/buildWorkout';
import './App.css';

const DEFAULT_PARAMS = {
  bmiValue: 22.5,
  gender: 'male',
  fitnessLevel: 'beginner',
  strictBeginner: true,
  equipment: new Set(['bodyweight']),
  workoutType: 'strength',
  durationMin: 30,
  targetMuscles: new Set(),
  injuries: new Set(),
};

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [rules, setRules] = useState({});
  const [rulesStatus, setRulesStatus] = useState(null); // 'loading' | 'ok' | 'error'

  const handleRefreshRules = async () => {
    setRulesStatus('loading');
    try {
      const res = await fetch('/WORKOUT_RULES.md?t=' + Date.now());
      if (!res.ok) throw new Error('Not found');
      const text = await res.text();

      // Parse the ## Config section: lines with "key: value"
      const configSection = text.split('## Config')[1]?.split('---')[0] || '';
      const parsed = {};
      for (const line of configSection.split('\n')) {
        const match = line.match(/^([a-zA-Z_0-9]+):\s*(.+)/);
        if (!match) continue;
        const [, key, raw] = match;
        const val = raw.trim();
        if (val === 'true')       parsed[key] = true;
        else if (val === 'false') parsed[key] = false;
        else if (!isNaN(val))     parsed[key] = Number(val);
        else                      parsed[key] = val;
      }

      // Rebuild durationCapMap from durationCapMap_N keys
      const capMap = {};
      for (const [k, v] of Object.entries(parsed)) {
        const m = k.match(/^durationCapMap_(\d+)$/);
        if (m) { capMap[m[1]] = v; delete parsed[k]; }
      }
      if (Object.keys(capMap).length) parsed.durationCapMap = capMap;

      setRules(parsed);
      setRulesStatus('ok');
      setTimeout(() => setRulesStatus(null), 2000);
    } catch {
      setRulesStatus('error');
      setTimeout(() => setRulesStatus(null), 2500);
    }
  };

  // Debounced pool size — recalculates 300ms after params stop changing
  const [poolSize, setPoolSize] = useState(null);
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPoolSize(getPoolSize(exercises, params, rules));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [params, rules]);

  const handleBuild = () => {
    const r = buildWorkout(exercises, params, rules);
    setResult(r);
    if (r.exercises.length > 0) {
      const entry = { params: { ...params }, result: r, timestamp: Date.now() };
      setHistory(prev => [...prev.slice(-9), entry]);

      // Save to local log file (non-blocking — fails silently if server not ready)
      const groupedExercises = [];
      for (const ex of r.exercises) {
        const last = groupedExercises[groupedExercises.length - 1];
        if (last && last.name === ex.name) { last.sets++; }
        else groupedExercises.push({ name: ex.name, sets: 1, duration: ex.assignedDuration, muscle: ex.targetMuscle });
      }
      fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fitnessLevel:  params.fitnessLevel,
          workoutType:   params.workoutType,
          durationMin:   params.durationMin,
          totalSec:      r.totalSec,
          restSec:       r.restSec,
          equipment:     [...params.equipment],
          targetMuscles: [...params.targetMuscles],
          injuries:      [...params.injuries],
          exercises:     groupedExercises,
        }),
      }).catch(() => {}); // silent — UI never depends on this
    }
  };

  const handleRestore = (entry) => {
    setParams(entry.params);
    setResult(entry.result);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">Viktor's Best Builder</div>
        <div className="header-meta">
          {exercises.length.toLocaleString()} exercises in database
        </div>
      </header>

      <main className="app-body">
        <FilterPanel
          params={params}
          onChange={setParams}
          onBuild={handleBuild}
          onRefreshRules={handleRefreshRules}
          rulesStatus={rulesStatus}
          poolSize={poolSize}
        />
        <WorkoutResult
          result={result}
          params={params}
          history={history}
          onRestore={handleRestore}
          onBuild={handleBuild}
          gender={params.gender}
        />
      </main>
    </div>
  );
}
