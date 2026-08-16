# Habit Tracker

A simple web application for tracking daily habits directly in the browser.

## Features

- Add a habit
- Mark a habit as completed
- Delete a habit
- Display daily progress
- Preserve data after refreshing or closing the browser
- Light and dark mode support

## Technologies

- Next.js
- React
- TypeScript
- Tailwind CSS
- Browser Local Storage API

## Getting started

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Data persistence

Habits are stored locally in the browser using `localStorage`.

Data is specific to:

- the browser profile;
- the device;
- the website origin, such as `http://localhost:3000`.

No account or remote database is required for this version.
