import HabitTracker from "./HabitTracker";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-12 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-8">
        <div className="flex flex-col gap-6">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              Habit Tracker
            </h1>
          </header>

          <HabitTracker />
        </div>
      </main>
    </div>
  );
}

