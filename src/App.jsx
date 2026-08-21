import React, { useState, useMemo } from 'react';
import exercises from './exercises.json';
import FilterPanel from './components/FilterPanel';
import WorkoutResult from './components/WorkoutResult';
import { buildWorkout } from './utils/buildWorkout';
import './App.css';

const DEFAULT_PARAMS = {
  bmiValue: 22.5,
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

  // Live pool size preview
  const poolSize = useMemo(() => {
    const r = buildWorkout(exercises, params);
    return r.poolSize;
  }, [params]);

  const handleBuild = () => {
    const r = buildWorkout(exercises, params);
    setResult(r);
    if (r.exercises.length > 0) {
      setHistory(prev => [...prev.slice(-9), { params: { ...params }, result: r, timestamp: Date.now() }]);
    }
  };

  const handleRestore = (entry) => {
    setParams(entry.params);
    setResult(entry.result);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">MB Workout Builder</div>
        <div className="header-meta">
          {exercises.length.toLocaleString()} exercises in database
        </div>
      </header>

      <main className="app-body">
        <FilterPanel
          params={params}
          onChange={setParams}
          onBuild={handleBuild}
          poolSize={poolSize}
        />
        <WorkoutResult
          result={result}
          params={params}
          history={history}
          onRestore={handleRestore}
          onBuild={handleBuild}
        />
      </main>
    </div>
  );
}
