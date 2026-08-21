# MB Workout Builder

A React workout builder app powered by the Welltech exercise database (1,811 exercises).

## Features

- **Parameter panel** — BMI with category badge, fitness level (beginner/intermediate/advanced), equipment, workout type, duration slider, target muscle picker, health concern exclusions
- **Live pool preview** — shows how many exercises match your current filters before you build
- **Smart duration assignment** — exercise duration varies based on MET intensity, static holds, and unilateral movements (not a flat 90s)
- **Build history** — last 10 workouts saved in session with one-click restore
- **Dark theme**

## Getting started

```bash
cd ~/strength_builder
npm install        # first time only
npm run dev        # starts dev server at http://localhost:5173
```

## Push to GitHub

1. Create a new repo on https://github.com/new (name: `strength-builder`, keep it empty)
2. Then in Terminal:

```bash
cd ~/strength_builder
git add -A
git commit -m "feat: initial workout builder app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/strength-builder.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Project structure

```
src/
  exercises.json          # 1,811 exercises extracted from exercise DB
  utils/buildWorkout.js   # filtering + workout generation logic
  components/
    FilterPanel.jsx        # all parameter inputs (left panel)
    WorkoutResult.jsx      # workout display + build history (right panel)
  App.jsx                 # root component, state management
  App.css                 # dark theme styles
```

## Exercise data fields

Each exercise includes: `id`, `name`, `primary[]`, `secondary[]`, `mets`, `static`, `plyometric`, `bodyweight`, `weights`, `machines`, `resistance`, `beginner`, `intermediate`, `advanced`, `level1`, `level2`, `cardio`, `strength_set`, `chair`, `knee`, `ankle`, `hip`, `shoulder_inj`, `back_pain`, `cvd`
