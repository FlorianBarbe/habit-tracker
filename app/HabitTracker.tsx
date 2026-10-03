"use client";

import {
  startTransition,
  useEffect,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import {
  ALL_DAYS,
  DEFAULT_CATEGORY,
  WEEKDAY_OPTIONS,
  cloneSchedule,
  createEmptyData,
  createInitialData,
  createSchedule,
  formatDateKey,
  formatShortDateKey,
  getCompletedHabitIds,
  getDayStats,
  getHabitStreaks,
  getHabitsDueOnDate,
  getLocalDateKey,
  getScheduleForDate,
  getScheduleLabel,
  getSevenDayStats,
  getTrackerStreaks,
  normalizeTrackerData,
  schedulesEqual,
  shiftDateKey,
  type Habit,
  type HabitSchedule,
  type HabitTrackerData,
  type ScheduleKind,
  type Weekday,
} from "./habit-tracker-model";

const STORAGE_KEY = "habit-tracker-habits";
const MAX_IMPORT_SIZE = 1_000_000;
const MAX_HABITS = 1_000;
const ALL_CATEGORIES_FILTER = "";

type StatusMessage = {
  text: string;
  isError: boolean;
};

type LoadResult = {
  data: HabitTrackerData;
  warning: string | null;
  canPersist: boolean;
  recoveryValue: string | null;
};

type SaveResult =
  | { ok: true }
  | { ok: false; message: string };

type ScheduleEditorProps = {
  idPrefix: string;
  schedule: HabitSchedule;
  onChange: (schedule: HabitSchedule) => void;
};

function ScheduleEditor({
  idPrefix,
  schedule,
  onChange,
}: ScheduleEditorProps) {
  function changeKind(event: ChangeEvent<HTMLSelectElement>) {
    const kind = event.target.value as ScheduleKind;
    const customDays = schedule.days.length > 0 ? schedule.days : ALL_DAYS;

    onChange(createSchedule(kind, customDays));
  }

  function toggleCustomDay(day: Weekday) {
    const nextDays = schedule.days.includes(day)
      ? schedule.days.filter((scheduledDay) => scheduledDay !== day)
      : [...schedule.days, day];

    onChange(createSchedule("custom", nextDays));
  }

  return (
    <div className="space-y-3">
      <label
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        htmlFor={`${idPrefix}-schedule`}
      >
        Schedule
      </label>

      <select
        id={`${idPrefix}-schedule`}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-800"
        value={schedule.kind}
        onChange={changeKind}
      >
        <option value="daily">Every day</option>
        <option value="weekdays">Weekdays</option>
        <option value="weekends">Weekends</option>
        <option value="custom">Custom days</option>
      </select>

      {schedule.kind === "custom" && (
        <fieldset>
          <legend className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Choose at least one day
          </legend>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {WEEKDAY_OPTIONS.map((option) => (
              <label
                className="flex cursor-pointer items-center justify-center gap-1 rounded-md border border-zinc-300 px-2 py-2 text-xs dark:border-zinc-700"
                key={option.value}
              >
                <input
                  type="checkbox"
                  checked={schedule.days.includes(option.value)}
                  onChange={() => toggleCustomDay(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown storage error.";
}

function loadTrackerData(todayKey: string): LoadResult {
  let storedValue: string | null;

  try {
    storedValue = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return {
      data: createEmptyData(),
      warning: `Browser storage is unavailable: ${errorMessage(error)}`,
      canPersist: false,
      recoveryValue: null,
    };
  }

  if (storedValue === null) {
    return {
      data: createInitialData(todayKey),
      warning: null,
      canPersist: true,
      recoveryValue: null,
    };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    parsedValue = null;
  }

  const normalizedData = normalizeTrackerData(parsedValue, todayKey);

  if (normalizedData === null) {
    let recoveryWasSaved = false;

    try {
      localStorage.setItem(
        `${STORAGE_KEY}-recovery-${todayKey}`,
        storedValue,
      );
      recoveryWasSaved = true;
    } catch (error) {
      console.error("Unable to preserve invalid local data:", error);
    }

    return {
      data: createEmptyData(),
      warning: recoveryWasSaved
        ? "Stored data is invalid. It was not overwritten; a recovery copy is also available below."
        : "Stored data is invalid. It was not overwritten; download the raw recovery copy below before resetting.",
      canPersist: false,
      recoveryValue: storedValue,
    };
  }

  const isDirectVersionTwo =
    typeof parsedValue === "object" &&
    parsedValue !== null &&
    "version" in parsedValue &&
    parsedValue.version === 2;

  if (!isDirectVersionTwo) {
    try {
      const backupKey = `${STORAGE_KEY}-pre-v2-${todayKey}`;

      if (localStorage.getItem(backupKey) === null) {
        localStorage.setItem(backupKey, storedValue);
      }
    } catch (error) {
      return {
        data: normalizedData,
        warning: `The old data was loaded but could not be backed up before migration: ${errorMessage(error)}`,
        canPersist: false,
        recoveryValue: storedValue,
      };
    }
  }

  return {
    data: normalizedData,
    warning: null,
    canPersist: true,
    recoveryValue: null,
  };
}

function saveTrackerData(data: HabitTrackerData): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    console.error("Unable to save Habit Tracker data:", error);
    return {
      ok: false,
      message: errorMessage(error),
    };
  }
}

function downloadTextFile(
  contents: string,
  fileName: string,
  type = "application/json",
) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalizeCategory(category: string): string {
  return category.trim() || DEFAULT_CATEGORY;
}

export default function HabitTracker() {
  const [data, setData] = useState<HabitTrackerData>(createEmptyData);
  const [calendar, setCalendar] = useState({
    todayKey: "",
    selectedDateKey: "",
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [recoveryValue, setRecoveryValue] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(
    ALL_CATEGORIES_FILTER,
  );

  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] =
    useState(DEFAULT_CATEGORY);
  const [newHabitSchedule, setNewHabitSchedule] = useState<HabitSchedule>(
    () => createSchedule("daily"),
  );

  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingSchedule, setEditingSchedule] = useState<HabitSchedule>(
    () => createSchedule("daily"),
  );

  useEffect(() => {
    const firstTodayKey = getLocalDateKey(new Date());
    const loadResult = loadTrackerData(firstTodayKey);

    startTransition(() => {
      setData(loadResult.data);
      setCalendar({
        todayKey: firstTodayKey,
        selectedDateKey: firstTodayKey,
      });
      setCanPersist(loadResult.canPersist);
      setRecoveryValue(loadResult.recoveryValue);
      setHasLoaded(true);

      if (loadResult.warning !== null) {
        setStatus({
          text: loadResult.warning,
          isError: true,
        });
      }
    });

    function refreshTodayKey() {
      const nextTodayKey = getLocalDateKey(new Date());

      startTransition(() => {
        setCalendar((currentCalendar) => {
          if (currentCalendar.todayKey === nextTodayKey) {
            return currentCalendar;
          }

          return {
            todayKey: nextTodayKey,
            selectedDateKey:
              currentCalendar.selectedDateKey === currentCalendar.todayKey ||
              currentCalendar.selectedDateKey > nextTodayKey
                ? nextTodayKey
                : currentCalendar.selectedDateKey,
          };
        });
      });
    }

    const timerId = window.setInterval(refreshTodayKey, 60_000);
    window.addEventListener("focus", refreshTodayKey);

    return () => {
      window.clearInterval(timerId);
      window.removeEventListener("focus", refreshTodayKey);
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded || !canPersist) {
      return;
    }

    const saveResult = saveTrackerData(data);

    if (!saveResult.ok) {
      startTransition(() => {
        setCanPersist(false);
        setStatus({
          text: `Changes are only in this tab because saving failed: ${saveResult.message}`,
          isError: true,
        });
      });
    }
  }, [canPersist, data, hasLoaded]);

  const { todayKey, selectedDateKey } = calendar;

  if (!hasLoaded || todayKey === "" || selectedDateKey === "") {
    return (
      <p
        className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        aria-live="polite"
      >
        Loading habits...
      </p>
    );
  }

  const isViewingToday = selectedDateKey === todayKey;
  const habitsDueOnSelectedDate = getHabitsDueOnDate(data, selectedDateKey);
  const completedHabitIds = getCompletedHabitIds(data, selectedDateKey);
  const selectedDayStats = getDayStats(data, selectedDateKey);
  const sevenDayStats = getSevenDayStats(data, todayKey);
  const trackerStreaks = getTrackerStreaks(data, todayKey);
  const activeHabits = data.habits
    .filter((habit) => habit.archivedOn === null)
    .sort(
      (first, second) =>
        first.order - second.order || first.id - second.id,
    );
  const archivedHabits = data.habits
    .filter((habit) => habit.archivedOn !== null)
    .sort((first, second) =>
      (second.archivedOn ?? "").localeCompare(first.archivedOn ?? ""),
    );
  const categories = [...new Set(data.habits.map((habit) => habit.category))]
    .sort((first, second) => first.localeCompare(second));
  const effectiveCategoryFilter =
    categoryFilter === ALL_CATEGORIES_FILTER || categories.includes(categoryFilter)
      ? categoryFilter
      : ALL_CATEGORIES_FILTER;
  const displayedHabits = habitsDueOnSelectedDate.filter(
    (habit) =>
      effectiveCategoryFilter === ALL_CATEGORIES_FILTER ||
      habit.category === effectiveCategoryFilter,
  );

  function showPreviousDay() {
    setCalendar((currentCalendar) => ({
      ...currentCalendar,
      selectedDateKey: shiftDateKey(currentCalendar.selectedDateKey, -1),
    }));
  }

  function showNextDay() {
    setCalendar((currentCalendar) => {
      if (currentCalendar.selectedDateKey >= currentCalendar.todayKey) {
        return currentCalendar;
      }

      const nextDateKey = shiftDateKey(
        currentCalendar.selectedDateKey,
        1,
      );

      return {
        ...currentCalendar,
        selectedDateKey:
          nextDateKey > currentCalendar.todayKey
            ? currentCalendar.todayKey
            : nextDateKey,
      };
    });
  }

  function selectDate(dateKey: string) {
    setCalendar((currentCalendar) => ({
      ...currentCalendar,
      selectedDateKey:
        dateKey > currentCalendar.todayKey
          ? currentCalendar.todayKey
          : dateKey,
    }));
  }

  function addHabit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newHabitName.trim();
    const category = normalizeCategory(newHabitCategory);

    if (name.length === 0 || name.length > 80) {
      setStatus({
        text: "A habit name must contain between 1 and 80 characters.",
        isError: true,
      });
      return;
    }

    if (category.length > 40) {
      setStatus({
        text: "A category must contain at most 40 characters.",
        isError: true,
      });
      return;
    }

    if (newHabitSchedule.days.length === 0) {
      setStatus({
        text: "Choose at least one scheduled day.",
        isError: true,
      });
      return;
    }

    if (data.habits.length >= MAX_HABITS) {
      setStatus({
        text: `The local tracker is limited to ${MAX_HABITS} habits.`,
        isError: true,
      });
      return;
    }

    const schedule = cloneSchedule(newHabitSchedule);

    setData((currentData) => {
      const usedIds = new Set(currentData.habits.map((habit) => habit.id));
      let nextId = 1;

      while (usedIds.has(nextId)) {
        nextId += 1;
      }

      const nextOrder =
        currentData.habits
          .filter((habit) => habit.archivedOn === null)
          .reduce(
            (largestOrder, habit) => Math.max(largestOrder, habit.order),
            -1,
          ) + 1;

      return {
        ...currentData,
        habits: [
          ...currentData.habits,
          {
            id: nextId,
            name,
            category,
            createdOn: todayKey,
            archivedOn: null,
            activePeriods: [{ startedOn: todayKey, endedOn: null }],
            schedule,
            scheduleHistory: [
              {
                startedOn: todayKey,
                schedule: cloneSchedule(schedule),
              },
            ],
            order: nextOrder,
          },
        ],
      };
    });

    setNewHabitName("");
    setNewHabitCategory(DEFAULT_CATEGORY);
    setNewHabitSchedule(createSchedule("daily"));
    setStatus({ text: `Added "${name}".`, isError: false });
  }

  function toggleHabit(habitId: number) {
    setData((currentData) => {
      const existingEntry = currentData.entries.find(
        (entry) =>
          entry.habitId === habitId && entry.date === selectedDateKey,
      );

      if (existingEntry?.completed) {
        return {
          ...currentData,
          entries: currentData.entries.filter(
            (entry) =>
              !(
                entry.habitId === habitId &&
                entry.date === selectedDateKey
              ),
          ),
        };
      }

      if (existingEntry !== undefined) {
        return {
          ...currentData,
          entries: currentData.entries.map((entry) =>
            entry.habitId === habitId && entry.date === selectedDateKey
              ? { ...entry, completed: true }
              : entry,
          ),
        };
      }

      return {
        ...currentData,
        entries: [
          ...currentData.entries,
          {
            habitId,
            date: selectedDateKey,
            completed: true,
          },
        ],
      };
    });
  }

  function beginEditing(habit: Habit) {
    setEditingHabitId(habit.id);
    setEditingName(habit.name);
    setEditingCategory(habit.category);
    setEditingSchedule(cloneSchedule(habit.schedule));
    setStatus(null);
  }

  function cancelEditing() {
    setEditingHabitId(null);
  }

  function saveEditedHabit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = editingName.trim();
    const category = normalizeCategory(editingCategory);

    if (name.length === 0 || name.length > 80) {
      setStatus({
        text: "A habit name must contain between 1 and 80 characters.",
        isError: true,
      });
      return;
    }

    if (category.length > 40 || editingSchedule.days.length === 0) {
      setStatus({
        text: "Check the category and choose at least one scheduled day.",
        isError: true,
      });
      return;
    }

    const schedule = cloneSchedule(editingSchedule);

    setData((currentData) => ({
      ...currentData,
      habits: currentData.habits.map((habit) => {
        if (habit.id !== editingHabitId) {
          return habit;
        }

        const scheduleChanged = !schedulesEqual(habit.schedule, schedule);

        return {
          ...habit,
          name,
          category,
          schedule,
          scheduleHistory: scheduleChanged
            ? [
                ...habit.scheduleHistory.filter(
                  (change) => change.startedOn < todayKey,
                ),
                {
                  startedOn: todayKey,
                  schedule: cloneSchedule(schedule),
                },
              ]
            : habit.scheduleHistory,
        };
      }),
    }));

    setEditingHabitId(null);
    setStatus({ text: `Updated "${name}".`, isError: false });
  }

  function archiveHabit(habit: Habit) {
    const shouldArchive = window.confirm(
      `Archive "${habit.name}"? Its history will be kept.`,
    );

    if (!shouldArchive) {
      return;
    }

    setData((currentData) => ({
      ...currentData,
      habits: currentData.habits.map((currentHabit) => {
        if (currentHabit.id !== habit.id) {
          return currentHabit;
        }

        return {
          ...currentHabit,
          archivedOn: todayKey,
          activePeriods: currentHabit.activePeriods.map((period) =>
            period.endedOn === null
              ? { ...period, endedOn: todayKey }
              : period,
          ),
        };
      }),
    }));

    if (editingHabitId === habit.id) {
      setEditingHabitId(null);
    }

    setStatus({
      text: `Archived "${habit.name}" without deleting its history.`,
      isError: false,
    });
  }

  function reactivateHabit(habit: Habit) {
    setData((currentData) => {
      const nextOrder =
        currentData.habits
          .filter((currentHabit) => currentHabit.archivedOn === null)
          .reduce(
            (largestOrder, currentHabit) =>
              Math.max(largestOrder, currentHabit.order),
            -1,
          ) + 1;

      return {
        ...currentData,
        habits: currentData.habits.map((currentHabit) => {
          if (currentHabit.id !== habit.id) {
            return currentHabit;
          }

          const periods = currentHabit.activePeriods.map((period) => ({
            ...period,
          }));
          const lastPeriod = periods[periods.length - 1];

          if (lastPeriod.endedOn === todayKey) {
            lastPeriod.endedOn = null;
          } else {
            periods.push({ startedOn: todayKey, endedOn: null });
          }

          return {
            ...currentHabit,
            archivedOn: null,
            activePeriods: periods,
            order: nextOrder,
          };
        }),
      };
    });

    setStatus({
      text: `Reactivated "${habit.name}" from today.`,
      isError: false,
    });
  }

  function moveHabit(habitId: number, direction: -1 | 1) {
    setData((currentData) => {
      const sortedActiveHabits = currentData.habits
        .filter((habit) => habit.archivedOn === null)
        .sort(
          (first, second) =>
            first.order - second.order || first.id - second.id,
        );
      const currentIndex = sortedActiveHabits.findIndex(
        (habit) => habit.id === habitId,
      );
      const targetIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= sortedActiveHabits.length
      ) {
        return currentData;
      }

      const reorderedHabits = [...sortedActiveHabits];
      [reorderedHabits[currentIndex], reorderedHabits[targetIndex]] = [
        reorderedHabits[targetIndex],
        reorderedHabits[currentIndex],
      ];
      const orderById = new Map(
        reorderedHabits.map((habit, order) => [habit.id, order]),
      );

      return {
        ...currentData,
        habits: currentData.habits.map((habit) => ({
          ...habit,
          order: orderById.get(habit.id) ?? habit.order,
        })),
      };
    });
  }

  function exportData() {
    const backup = {
      format: "habit-tracker-backup",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      data,
    };

    downloadTextFile(
      JSON.stringify(backup, null, 2),
      `habit-tracker-${todayKey}.json`,
    );
    setStatus({ text: "Backup exported.", isError: false });
  }

  function downloadRecoveryData() {
    if (recoveryValue === null) {
      return;
    }

    downloadTextFile(
      recoveryValue,
      `habit-tracker-recovery-${todayKey}.json`,
    );
    setStatus({ text: "Raw recovery data downloaded.", isError: false });
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file === undefined) {
      return;
    }

    try {
      if (file.size > MAX_IMPORT_SIZE) {
        throw new Error("The backup exceeds 1 MB.");
      }

      const parsedValue: unknown = JSON.parse(await file.text());
      const importedData = normalizeTrackerData(parsedValue, todayKey);

      if (importedData === null) {
        throw new Error("Unsupported or invalid backup.");
      }

      const shouldImport = window.confirm(
        "Replace all current habits and history with this backup?",
      );

      if (!shouldImport) {
        setStatus({ text: "Import cancelled.", isError: false });
        return;
      }

      const saveResult = saveTrackerData(importedData);

      if (!saveResult.ok) {
        throw new Error(`The backup is valid but could not be saved: ${saveResult.message}`);
      }

      setData(importedData);
      setCanPersist(true);
      setRecoveryValue(null);
      setCategoryFilter(ALL_CATEGORIES_FILTER);
      setEditingHabitId(null);
      setCalendar((currentCalendar) => ({
        ...currentCalendar,
        selectedDateKey: currentCalendar.todayKey,
      }));
      setStatus({ text: "Backup imported successfully.", isError: false });
    } catch (error) {
      setStatus({
        text:
          error instanceof Error
            ? `Import failed: ${error.message}`
            : "Import failed.",
        isError: true,
      });
    } finally {
      input.value = "";
    }
  }

  function resetData() {
    const shouldReset = window.confirm(
      "Delete all habits, categories and history? This cannot be undone.",
    );

    if (!shouldReset) {
      return;
    }

    const emptyData = createEmptyData();
    const saveResult = saveTrackerData(emptyData);

    if (!saveResult.ok) {
      setStatus({
        text: `Reset failed because browser storage could not be updated: ${saveResult.message}`,
        isError: true,
      });
      return;
    }

    setData(emptyData);
    setCanPersist(true);
    setRecoveryValue(null);
    setCategoryFilter(ALL_CATEGORIES_FILTER);
    setEditingHabitId(null);
    setCalendar((currentCalendar) => ({
      ...currentCalendar,
      selectedDateKey: currentCalendar.todayKey,
    }));
    setStatus({ text: "All local data was reset.", isError: false });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-3" aria-label="Selected day">
        <h2
          className="text-center text-base font-medium text-zinc-500 dark:text-zinc-400"
          aria-live="polite"
        >
          <time dateTime={selectedDateKey}>
            {isViewingToday ? "Today — " : ""}
            {formatDateKey(selectedDateKey)}
          </time>
        </h2>

        <nav
          className="grid grid-cols-2 gap-2"
          aria-label="Day navigation"
        >
          <button
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            type="button"
            onClick={showPreviousDay}
          >
            ← Previous day
          </button>

          <button
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            type="button"
            onClick={showNextDay}
            disabled={isViewingToday}
          >
            Next day →
          </button>
        </nav>
      </section>

      <section className="space-y-2" aria-labelledby="daily-progress-title">
        <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <h3 id="daily-progress-title">Daily progress</h3>
          <span>
            {selectedDayStats.completedCount} / {selectedDayStats.dueCount}
          </span>
        </div>

        <div
          className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-label="Daily progress"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, selectedDayStats.dueCount)}
          aria-valuenow={selectedDayStats.completedCount}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${selectedDayStats.percentage}%` }}
          />
        </div>
      </section>

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label="Habit statistics"
      >
        <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Current streak
          </p>
          <p className="mt-1 text-2xl font-bold">
            {trackerStreaks.current}
            <span className="ml-1 text-sm font-normal">days</span>
          </p>
        </div>

        <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Best streak
          </p>
          <p className="mt-1 text-2xl font-bold">
            {trackerStreaks.best}
            <span className="ml-1 text-sm font-normal">days</span>
          </p>
        </div>

        <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Last 7 days
          </p>
          <p className="mt-1 text-2xl font-bold">
            {sevenDayStats.percentage}%
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {sevenDayStats.completedCount}/{sevenDayStats.dueCount} completed
          </p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="weekly-view-title">
        <h3 id="weekly-view-title" className="font-semibold">
          Last seven days
        </h3>

        <div className="grid grid-cols-7 gap-1">
          {sevenDayStats.days.map((day) => (
            <button
              className={`rounded-lg border px-1 py-2 text-center text-xs transition ${
                day.dateKey === selectedDateKey
                  ? "border-zinc-900 bg-zinc-100 ring-2 ring-zinc-300 dark:border-zinc-100 dark:bg-zinc-800 dark:ring-zinc-700"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
              }`}
              type="button"
              key={day.dateKey}
              onClick={() => selectDate(day.dateKey)}
              aria-label={`${formatDateKey(day.dateKey)}: ${day.completedCount} of ${day.dueCount} habits completed`}
            >
              <span className="block">{formatShortDateKey(day.dateKey)}</span>
              <span className="mt-1 block font-semibold">
                {day.completedCount}/{day.dueCount}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2" aria-labelledby="category-filter-title">
        <label
          id="category-filter-title"
          className="block text-sm font-medium"
          htmlFor="category-filter"
        >
          Filter by category
        </label>
        <select
          id="category-filter"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          value={effectiveCategoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value={ALL_CATEGORIES_FILTER}>All categories</option>
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
      </section>

      {isViewingToday ? (
        <section
          className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          aria-labelledby="add-habit-title"
        >
          <h3 id="add-habit-title" className="mb-4 font-semibold">
            Add a habit
          </h3>

          <form className="space-y-4" onSubmit={addHabit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                <span>Name</span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-800"
                  type="text"
                  value={newHabitName}
                  maxLength={80}
                  onChange={(event) => setNewHabitName(event.target.value)}
                  placeholder="New habit"
                />
              </label>

              <label className="space-y-1 text-sm font-medium">
                <span>Category</span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-800"
                  type="text"
                  value={newHabitCategory}
                  maxLength={40}
                  onChange={(event) =>
                    setNewHabitCategory(event.target.value)
                  }
                />
              </label>
            </div>

            <ScheduleEditor
              idPrefix="new-habit"
              schedule={newHabitSchedule}
              onChange={setNewHabitSchedule}
            />

            <button
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              type="submit"
            >
              Add habit
            </button>
          </form>
        </section>
      ) : (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          You are viewing history. You can correct completions here; adding,
          editing and archiving are available on Today.
        </p>
      )}

      <section className="space-y-4" aria-labelledby="habit-list-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="habit-list-title" className="font-semibold">
            Habits for this day
          </h3>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {displayedHabits.length} shown
          </span>
        </div>

        {displayedHabits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {habitsDueOnSelectedDate.length === 0
              ? "No habits scheduled for this day."
              : "No habits match this category filter."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {displayedHabits.map((habit) => {
              const isCompleted = completedHabitIds.has(habit.id);
              const habitStreaks = getHabitStreaks(data, habit, todayKey);

              return (
                <li
                  className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  key={habit.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                      <input
                        className="mt-1 h-5 w-5 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleHabit(habit.id)}
                      />

                      <span className="min-w-0">
                        <span
                          className={`block font-medium ${
                            isCompleted
                              ? "text-zinc-400 line-through dark:text-zinc-500"
                              : "text-zinc-800 dark:text-zinc-100"
                          }`}
                        >
                          {habit.name}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                          {habit.category} ·{" "}
                          {getScheduleLabel(
                            getScheduleForDate(habit, selectedDateKey),
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                          Current streak: {habitStreaks.current} · Best:{" "}
                          {habitStreaks.best}
                        </span>
                      </span>
                    </label>
                  </div>

                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isViewingToday && (
        <section className="space-y-4" aria-labelledby="manage-habits-title">
          <div>
            <h3 id="manage-habits-title" className="font-semibold">
              Manage active habits
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              All active habits appear here, including those not scheduled today.
            </p>
          </div>

          {activeHabits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No active habits to manage.
            </p>
          ) : (
            <ul className="space-y-3">
              {activeHabits.map((habit, activeIndex) => (
                <li
                  className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  key={habit.id}
                >
                  {editingHabitId === habit.id ? (
                    <form className="space-y-4" onSubmit={saveEditedHabit}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm font-medium">
                          <span>Name</span>
                          <input
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                            value={editingName}
                            maxLength={80}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                            autoFocus
                          />
                        </label>

                        <label className="space-y-1 text-sm font-medium">
                          <span>Category</span>
                          <input
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                            value={editingCategory}
                            maxLength={40}
                            onChange={(event) =>
                              setEditingCategory(event.target.value)
                            }
                          />
                        </label>
                      </div>

                      <ScheduleEditor
                        idPrefix={`edit-${habit.id}`}
                        schedule={editingSchedule}
                        onChange={setEditingSchedule}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                          type="submit"
                        >
                          Save changes
                        </button>
                        <button
                          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
                          type="button"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium">{habit.name}</p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {habit.category} · {getScheduleLabel(habit.schedule)}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <button
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
                          type="button"
                          disabled={activeIndex === 0}
                          onClick={() => moveHabit(habit.id, -1)}
                          aria-label={`Move ${habit.name} up`}
                        >
                          Move up
                        </button>
                        <button
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
                          type="button"
                          disabled={activeIndex === activeHabits.length - 1}
                          onClick={() => moveHabit(habit.id, 1)}
                          aria-label={`Move ${habit.name} down`}
                        >
                          Move down
                        </button>
                        <button
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                          type="button"
                          onClick={() => beginEditing(habit)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          type="button"
                          onClick={() => archiveHabit(habit)}
                        >
                          Archive
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {archivedHabits.length > 0 && (
        <details className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer font-semibold">
            Archived habits ({archivedHabits.length})
          </summary>

          <ul className="mt-4 space-y-3">
            {archivedHabits.map((habit) => (
              <li
                className="flex items-center justify-between gap-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                key={habit.id}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {habit.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {habit.category} · Archived{" "}
                    {habit.archivedOn === null
                      ? ""
                      : formatDateKey(habit.archivedOn)}
                  </span>
                </span>

                <button
                  className="shrink-0 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                  type="button"
                  onClick={() => reactivateHabit(habit)}
                >
                  Reactivate
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer font-semibold">
          Data management
        </summary>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
            type="button"
            onClick={exportData}
          >
            Export backup
          </button>

          <label className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-medium dark:border-zinc-700">
            Import backup
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={importData}
            />
          </label>

          <button
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900"
            type="button"
            onClick={resetData}
          >
            Reset all data
          </button>

          {recoveryValue !== null && (
            <button
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-900 dark:text-amber-300"
              type="button"
              onClick={downloadRecoveryData}
            >
              Download raw recovery
            </button>
          )}
        </div>

        {!canPersist && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Automatic saving is paused so the existing browser data is not
            overwritten. Export what you can, then import a valid backup or use
            Reset all data to start cleanly.
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Data stays in this browser and is separate for localhost, your network
          address and the Vercel website. Export/import transfers it safely.
        </p>
      </details>

      {status !== null && (
        <p
          className={`rounded-lg p-3 text-sm ${
            status.isError
              ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
          role={status.isError ? "alert" : "status"}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
