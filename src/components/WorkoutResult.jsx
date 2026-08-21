import React, { useState } from 'react';

const MUSCLE_COLORS = {
  abs:'#f472b6', quadriceps:'#60a5fa', glutes:'#a78bfa',
  hamstrings:'#34d399', chest:'#fb923c', back:'#38bdf8',
  lower_back:'#facc15', triceps:'#c084fc', shoulders:'#4ade80',
  calves:'#f87171', biceps:'#a3e635', trapezius:'#94a3b8',
};

function ExerciseRow({ ex, index }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const primary = ex.primary[0] || 'abs';
  const color   = MUSCLE_COLORS[primary] || '#94a3b8';
  const tag     = ex.static ? 'hold' : ex.isUnilateral ? 'L+R' : null;
  const equip   = [
    ex.bodyweight && 'bodyweight',
    ex.weights    && 'weights',
    ex.machines   && 'machine',
    ex.resistance && 'band',
  ].filter(Boolean).join(' / ') || '—';

  const hasVideo = !!ex.video_url;

  return (
    <div className="ex-row-wrap">
      <div className="ex-row">
        <span className="ex-num">{index + 1}</span>
        <div className="ex-dot" style={{ background: color }} />
        <div className="ex-body">
          <div className="ex-name">
            {ex.name}
            {tag && <span className="ex-tag">{tag}</span>}
          </div>
          <div className="ex-meta">
            <span className="ex-muscle" style={{ color, background: color + '18' }}>{primary.replace('_',' ')}</span>
            {ex.secondary.slice(0,2).map(m => (
              <span key={m} className="ex-muscle secondary">{m.replace('_',' ')}</span>
            ))}
            <span className="ex-equip">{equip}</span>
          </div>
        </div>
        <div className="ex-right">
          <span className="ex-dur">{ex.assignedDuration}s</span>
          <span className="ex-mets">mets {ex.mets}</span>
          {hasVideo ? (
            <button
              className={`ex-play ${videoOpen ? 'active' : ''}`}
              onClick={() => setVideoOpen(v => !v)}
              title={videoOpen ? 'Close video' : 'Preview exercise'}
            >
              {videoOpen ? '✕' : '▶'}
            </button>
          ) : (
            <span className="ex-play no-video" title="No video available">—</span>
          )}
        </div>
      </div>

      {videoOpen && hasVideo && (
        <div className="ex-video-wrap">
          <video
            key={ex.video_url}
            src={ex.video_url}
            poster={ex.preview_url || undefined}
            autoPlay
            loop
            muted
            playsInline
            className="ex-video"
          />
        </div>
      )}
    </div>
  );
}

function HistoryItem({ entry, index, onRestore }) {
  const d = new Date(entry.timestamp);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="history-item">
      <div className="history-meta">
        <span className="history-time">#{index + 1} · {time}</span>
        <span className="history-summary">
          {entry.params.fitnessLevel} · {entry.params.durationMin}min ·{' '}
          {entry.result.exercises.length} exercises
        </span>
      </div>
      <button className="restore-btn" onClick={() => onRestore(entry)}>Restore</button>
    </div>
  );
}

export default function WorkoutResult({ result, params, history, onRestore, onBuild }) {
  if (!result) {
    return (
      <div className="result-panel empty">
        <div className="empty-icon">⚡</div>
        <div className="empty-title">Set your parameters and build a workout</div>
        <div className="empty-sub">Results will appear here</div>
      </div>
    );
  }

  const { exercises, totalSec } = result;
  const totalMin = Math.floor(totalSec / 60);
  const totalS   = totalSec % 60;

  // Muscle distribution
  const muscleCount = {};
  for (const e of exercises) {
    const m = e.primary[0] || 'abs';
    muscleCount[m] = (muscleCount[m] || 0) + 1;
  }

  return (
    <div className="result-panel">
      {/* Summary bar */}
      <div className="result-header">
        <div className="result-header-top">
          <div className="result-summary">
          <div className="summary-stat">
            <span className="stat-val">{exercises.length}</span>
            <span className="stat-label">exercises</span>
          </div>
          <div className="summary-stat">
            <span className="stat-val">{totalMin}m{totalS > 0 ? `${totalS}s` : ''}</span>
            <span className="stat-label">duration</span>
          </div>
          <div className="summary-stat">
            <span className="stat-val">{params.fitnessLevel}</span>
            <span className="stat-label">level</span>
          </div>
          <div className="summary-stat">
            <span className="stat-val">{params.durationMin}min</span>
            <span className="stat-label">target</span>
          </div>
        </div>
          <button className="new-workout-btn" onClick={onBuild}>⚡ New Workout</button>
        </div>
        <div className="muscle-dist">
          {Object.entries(muscleCount).map(([m, count]) => {
            const color = MUSCLE_COLORS[m] || '#94a3b8';
            return (
              <span key={m} className="dist-chip" style={{ background: color + '20', color, borderColor: color + '44' }}>
                {m.replace('_',' ')} ×{count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Exercise list */}
      <div className="ex-list">
        {exercises.length === 0 ? (
          <div className="no-results">No exercises match your current filters. Try relaxing some constraints.</div>
        ) : (
          exercises.map((ex, i) => <ExerciseRow key={ex.id || ex.name + i} ex={ex} index={i} />)
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="history-title">Build History</div>
          {[...history].reverse().map((entry, i) => (
            <HistoryItem key={entry.timestamp} entry={entry} index={history.length - 1 - i} onRestore={onRestore} />
          ))}
        </div>
      )}
    </div>
  );
}
