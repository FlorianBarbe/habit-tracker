"use client";

import {
    startTransition,
    useEffect,
    useState,
    type SubmitEvent,
} from "react";

type Habit = {
    id: number;
    name: string;
};

type HabitEntry = {
    habitId: number;
    date: string;
    completed: boolean;
};

type HabitTrackerData = {
    habits: Habit[];
    entries: HabitEntry[];
};

type LegacyHabit = Habit & {
    completed: boolean;
};

const initialData: HabitTrackerData = {
    habits: [
        { id: 1, name: "Read 20 minutes" },
        { id: 2, name: "Exercise" },
        { id: 3, name: "Meditate" },
        { id: 4, name: "Take vitamins" },
    ],
    entries: [],
};

const STORAGE_KEY = "habit-tracker-habits";

function getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isHabit(value: unknown): value is Habit {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const possibleHabit = value as Record<string, unknown>;

    return (
        typeof possibleHabit.id === "number" &&
        typeof possibleHabit.name === "string"
    );
}

function isHabitEntry(value: unknown): value is HabitEntry {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const possibleEntry = value as Record<string, unknown>;

    return (
        typeof possibleEntry.habitId === "number" &&
        typeof possibleEntry.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(possibleEntry.date) &&
        typeof possibleEntry.completed === "boolean"
    );
}

function isHabitTrackerData(
    value: unknown,
): value is HabitTrackerData {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const possibleData = value as Record<string, unknown>;

    return (
        Array.isArray(possibleData.habits) &&
        possibleData.habits.every(isHabit) &&
        Array.isArray(possibleData.entries) &&
        possibleData.entries.every(isHabitEntry)
    );
}

function isLegacyHabit(value: unknown): value is LegacyHabit {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const possibleHabit = value as Record<string, unknown>;

    return (
        typeof possibleHabit.id === "number" &&
        typeof possibleHabit.name === "string" &&
        typeof possibleHabit.completed === "boolean"
    );
}

function loadTrackerData(
    todayKey: string,
): HabitTrackerData | null {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (savedData === null) {
            return null;
        }

        const parsedData: unknown = JSON.parse(savedData);

        if (isHabitTrackerData(parsedData)) {
            return parsedData;
        }

        // Migration automatique des données de la V0.
        if (
            Array.isArray(parsedData) &&
            parsedData.every(isLegacyHabit)
        ) {
            return {
                habits: parsedData.map(({ id, name }) => ({
                    id,
                    name,
                })),
                entries: parsedData
                    .filter((habit) => habit.completed)
                    .map((habit) => ({
                        habitId: habit.id,
                        date: todayKey,
                        completed: true,
                    })),
            };
        }

        localStorage.removeItem(STORAGE_KEY);
        return null;
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

function saveTrackerData(data: HabitTrackerData) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data),
        );
    } catch (error) {
        console.error("Unable to save habits:", error);
    }
}

export default function HabitTracker() {
    const [data, setData] =
        useState<HabitTrackerData>(initialData);

    const [newHabitName, setNewHabitName] = useState("");
    const [todayKey, setTodayKey] = useState("");
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        const firstTodayKey = getLocalDateKey(new Date());
        const savedData = loadTrackerData(firstTodayKey);

        startTransition(() => {
            setData(savedData ?? initialData);
            setTodayKey(firstTodayKey);
            setHasLoaded(true);
        });

        function refreshTodayKey() {
            const nextTodayKey = getLocalDateKey(new Date());

            startTransition(() => {
                setTodayKey((currentTodayKey) =>
                    currentTodayKey === nextTodayKey
                        ? currentTodayKey
                        : nextTodayKey,
                );
            });
        }

        // Détecte le passage à une nouvelle journée.
        const timerId = window.setInterval(
            refreshTodayKey,
            60_000,
        );

        window.addEventListener("focus", refreshTodayKey);

        return () => {
            window.clearInterval(timerId);
            window.removeEventListener(
                "focus",
                refreshTodayKey,
            );
        };
    }, []);

    useEffect(() => {
        // Empêche d’écraser localStorage avant sa lecture.
        if (!hasLoaded) {
            return;
        }

        saveTrackerData(data);
    }, [data, hasLoaded]);

    if (!hasLoaded || todayKey === "") {
        return (
            <p
                className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                aria-live="polite"
            >
                Loading habits...
            </p>
        );
    }

    const completedHabitIds = new Set(
        data.entries
            .filter(
                (entry) =>
                    entry.date === todayKey &&
                    entry.completed,
            )
            .map((entry) => entry.habitId),
    );

    const completedHabitsCount = data.habits.filter(
        (habit) => completedHabitIds.has(habit.id),
    ).length;

    const completionPercentage =
        data.habits.length === 0
            ? 0
            : (completedHabitsCount / data.habits.length) *
            100;

    function addHabit(
        event: SubmitEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const name = newHabitName.trim();

        if (name === "") {
            return;
        }

        setData((currentData) => {
            const nextId =
                currentData.habits.reduce(
                    (largestId, habit) =>
                        Math.max(largestId, habit.id),
                    0,
                ) + 1;

            return {
                ...currentData,
                habits: [
                    ...currentData.habits,
                    { id: nextId, name },
                ],
            };
        });

        setNewHabitName("");
    }

    function toggleHabit(habitId: number) {
        setData((currentData) => {
            const entryAlreadyExists =
                currentData.entries.some(
                    (entry) =>
                        entry.habitId === habitId &&
                        entry.date === todayKey,
                );

            const updatedEntries = entryAlreadyExists
                ? currentData.entries.map((entry) =>
                    entry.habitId === habitId &&
                        entry.date === todayKey
                        ? {
                            ...entry,
                            completed: !entry.completed,
                        }
                        : entry,
                )
                : [
                    ...currentData.entries,
                    {
                        habitId,
                        date: todayKey,
                        completed: true,
                    },
                ];

            return {
                ...currentData,
                entries: updatedEntries,
            };
        });
    }

    function deleteHabit(habitId: number) {
        setData((currentData) => ({
            habits: currentData.habits.filter(
                (habit) => habit.id !== habitId,
            ),
            entries: currentData.entries.filter(
                (entry) => entry.habitId !== habitId,
            ),
        }));
    }

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-base font-medium text-zinc-500 dark:text-zinc-400">
                <time dateTime={todayKey}>Today</time>
            </h2>

            <section className="space-y-2">
                <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
                    <span>Daily progress</span>

                    <span>
                        {completedHabitsCount} /{" "}
                        {data.habits.length}
                    </span>
                </div>

                <div
                    className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                    role="progressbar"
                    aria-label="Daily progress"
                    aria-valuemin={0}
                    aria-valuemax={data.habits.length}
                    aria-valuenow={completedHabitsCount}
                >
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{
                            width: `${completionPercentage}%`,
                        }}
                    />
                </div>
            </section>

            <form
                className="flex gap-2"
                onSubmit={addHabit}
            >
                <input
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                    type="text"
                    value={newHabitName}
                    onChange={(event) =>
                        setNewHabitName(event.target.value)
                    }
                    placeholder="New habit"
                    aria-label="New habit name"
                />

                <button
                    className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    type="submit"
                >
                    Add
                </button>
            </form>

            {data.habits.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No habits yet. Add one above.
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {data.habits.map((habit) => {
                        const isCompleted =
                            completedHabitIds.has(habit.id);

                        return (
                            <li
                                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                                key={habit.id}
                            >
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                    <input
                                        className="h-5 w-5 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                                        type="checkbox"
                                        checked={isCompleted}
                                        onChange={() =>
                                            toggleHabit(habit.id)
                                        }
                                    />

                                    <span
                                        className={
                                            isCompleted
                                                ? "text-zinc-400 line-through dark:text-zinc-500"
                                                : "text-zinc-800 dark:text-zinc-100"
                                        }
                                    >
                                        {habit.name}
                                    </span>
                                </label>

                                <button
                                    className="rounded-md px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                                    type="button"
                                    onClick={() =>
                                        deleteHabit(habit.id)
                                    }
                                    aria-label={`Delete ${habit.name}`}
                                >
                                    Delete
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}