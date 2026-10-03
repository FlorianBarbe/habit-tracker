export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleKind =
  | "daily"
  | "weekdays"
  | "weekends"
  | "custom";

export type HabitSchedule = {
  kind: ScheduleKind;
  days: Weekday[];
};

export type ActivePeriod = {
  startedOn: string;
  endedOn: string | null;
};

export type ScheduleChange = {
  startedOn: string;
  schedule: HabitSchedule;
};

export type Habit = {
  id: number;
  name: string;
  category: string;
  createdOn: string;
  archivedOn: string | null;
  activePeriods: ActivePeriod[];
  schedule: HabitSchedule;
  scheduleHistory: ScheduleChange[];
  order: number;
};

export type HabitEntry = {
  habitId: number;
  date: string;
  completed: boolean;
};

export type HabitTrackerData = {
  version: 2;
  habits: Habit[];
  entries: HabitEntry[];
};

export type DayStats = {
  dateKey: string;
  dueCount: number;
  completedCount: number;
  percentage: number;
  fullyCompleted: boolean;
};

export type StreakStats = {
  current: number;
  best: number;
};

type LegacyHabit = {
  id: number;
  name: string;
  completed: boolean;
};

type PreviousHabit = {
  id: number;
  name: string;
};

type PreviousData = {
  habits: PreviousHabit[];
  entries: HabitEntry[];
};

const MAX_STATS_DAYS = 10_000;
const MAX_HABITS = 1_000;
const MAX_ENTRIES = 100_000;
const MAX_ACTIVE_PERIODS_PER_HABIT = 1_000;
const MAX_SCHEDULE_CHANGES_PER_HABIT = 1_000;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export const DEFAULT_CATEGORY = "General";
export const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];
export const WEEKENDS: Weekday[] = [0, 6];

export const WEEKDAY_OPTIONS: Array<{
  value: Weekday;
  label: string;
}> = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isDateKey(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function shiftDateKey(
  dateKey: string,
  numberOfDays: number,
): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shiftedDate = new Date(
    Date.UTC(year, month - 1, day + numberOfDays),
  );

  return [
    shiftedDate.getUTCFullYear(),
    String(shiftedDate.getUTCMonth() + 1).padStart(2, "0"),
    String(shiftedDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatShortDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getWeekday(dateKey: string): Weekday {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(
    Date.UTC(year, month - 1, day),
  ).getUTCDay() as Weekday;
}

function normalizeDays(days: Weekday[]): Weekday[] {
  return [...new Set(days)].sort((first, second) => first - second);
}

export function createSchedule(
  kind: ScheduleKind,
  customDays: Weekday[] = ALL_DAYS,
): HabitSchedule {
  switch (kind) {
    case "daily":
      return { kind, days: [...ALL_DAYS] };
    case "weekdays":
      return { kind, days: [...WEEKDAYS] };
    case "weekends":
      return { kind, days: [...WEEKENDS] };
    case "custom":
      return { kind, days: normalizeDays(customDays) };
  }
}

export function cloneSchedule(
  schedule: HabitSchedule,
): HabitSchedule {
  return {
    kind: schedule.kind,
    days: [...schedule.days],
  };
}

export function schedulesEqual(
  first: HabitSchedule,
  second: HabitSchedule,
): boolean {
  return (
    first.kind === second.kind &&
    first.days.length === second.days.length &&
    first.days.every((day, index) => day === second.days[index])
  );
}

export function getScheduleLabel(schedule: HabitSchedule): string {
  if (schedule.kind === "daily") {
    return "Daily";
  }

  if (schedule.kind === "weekdays") {
    return "Weekdays";
  }

  if (schedule.kind === "weekends") {
    return "Weekends";
  }

  return WEEKDAY_OPTIONS.filter((option) =>
    schedule.days.includes(option.value),
  )
    .map((option) => option.label)
    .join(", ");
}

function isWeekday(value: unknown): value is Weekday {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

function hasSameDays(first: Weekday[], second: Weekday[]): boolean {
  const normalizedFirst = normalizeDays(first);
  const normalizedSecond = normalizeDays(second);

  return (
    normalizedFirst.length === normalizedSecond.length &&
    normalizedFirst.every(
      (day, index) => day === normalizedSecond[index],
    )
  );
}

function isHabitSchedule(value: unknown): value is HabitSchedule {
  if (
    !isRecord(value) ||
    !Array.isArray(value.days) ||
    !value.days.every(isWeekday) ||
    new Set(value.days).size !== value.days.length
  ) {
    return false;
  }

  if (value.kind === "daily") {
    return hasSameDays(value.days, ALL_DAYS);
  }

  if (value.kind === "weekdays") {
    return hasSameDays(value.days, WEEKDAYS);
  }

  if (value.kind === "weekends") {
    return hasSameDays(value.days, WEEKENDS);
  }

  return value.kind === "custom" && value.days.length > 0;
}

function isActivePeriod(value: unknown): value is ActivePeriod {
  return (
    isRecord(value) &&
    isDateKey(value.startedOn) &&
    (value.endedOn === null ||
      (isDateKey(value.endedOn) && value.endedOn >= value.startedOn))
  );
}

function areActivePeriodsValid(periods: ActivePeriod[]): boolean {
  if (periods.length === 0) {
    return false;
  }

  return periods.every((period, index) => {
    if (index === 0) {
      return true;
    }

    const previousPeriod = periods[index - 1];

    return (
      previousPeriod.endedOn !== null &&
      period.startedOn > previousPeriod.endedOn
    );
  });
}

function isScheduleChange(value: unknown): value is ScheduleChange {
  return (
    isRecord(value) &&
    isDateKey(value.startedOn) &&
    isHabitSchedule(value.schedule)
  );
}

function isHabit(value: unknown): value is Habit {
  if (
    !isRecord(value) ||
    !isPositiveInteger(value.id) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    value.name.trim().length > 80 ||
    typeof value.category !== "string" ||
    value.category.trim().length === 0 ||
    value.category.trim().length > 40 ||
    !isDateKey(value.createdOn) ||
    (value.archivedOn !== null && !isDateKey(value.archivedOn)) ||
    !Array.isArray(value.activePeriods) ||
    value.activePeriods.length > MAX_ACTIVE_PERIODS_PER_HABIT ||
    !value.activePeriods.every(isActivePeriod) ||
    !areActivePeriodsValid(value.activePeriods) ||
    !isHabitSchedule(value.schedule) ||
    !Array.isArray(value.scheduleHistory) ||
    value.scheduleHistory.length === 0 ||
    value.scheduleHistory.length > MAX_SCHEDULE_CHANGES_PER_HABIT ||
    !value.scheduleHistory.every(isScheduleChange) ||
    !isNonNegativeInteger(value.order)
  ) {
    return false;
  }

  const activePeriods = value.activePeriods;
  const scheduleHistory = value.scheduleHistory;
  const lastPeriod = activePeriods[activePeriods.length - 1];
  const lastSchedule = scheduleHistory[scheduleHistory.length - 1];

  if (
    activePeriods[0].startedOn !== value.createdOn ||
    scheduleHistory[0].startedOn !== value.createdOn ||
    !schedulesEqual(lastSchedule.schedule, value.schedule) ||
    scheduleHistory.some(
      (change, index) =>
        index > 0 &&
        change.startedOn <= scheduleHistory[index - 1].startedOn,
    )
  ) {
    return false;
  }

  if (lastPeriod.endedOn === null) {
    return value.archivedOn === null;
  }

  return value.archivedOn === lastPeriod.endedOn;
}

function isHabitEntry(value: unknown): value is HabitEntry {
  return (
    isRecord(value) &&
    isPositiveInteger(value.habitId) &&
    isDateKey(value.date) &&
    typeof value.completed === "boolean"
  );
}

function isVersionTwoData(value: unknown): value is HabitTrackerData {
  if (
    !isRecord(value) ||
    value.version !== 2 ||
    !Array.isArray(value.habits) ||
    value.habits.length > MAX_HABITS ||
    !value.habits.every(isHabit) ||
    !Array.isArray(value.entries) ||
    value.entries.length > MAX_ENTRIES ||
    !value.entries.every(isHabitEntry)
  ) {
    return false;
  }

  const habitIds = value.habits.map((habit) => habit.id);
  const validHabitIds = new Set(habitIds);
  const entryKeys = value.entries.map(
    (entry) => `${entry.habitId}:${entry.date}`,
  );

  return (
    validHabitIds.size === habitIds.length &&
    new Set(entryKeys).size === entryKeys.length &&
    value.entries.every((entry) => validHabitIds.has(entry.habitId))
  );
}

function cloneData(data: HabitTrackerData): HabitTrackerData {
  return {
    version: 2,
    habits: data.habits.map((habit) => ({
      ...habit,
      name: habit.name.trim(),
      category: habit.category.trim(),
      activePeriods: habit.activePeriods.map((period) => ({ ...period })),
      schedule: cloneSchedule(habit.schedule),
      scheduleHistory: habit.scheduleHistory.map((change) => ({
        startedOn: change.startedOn,
        schedule: cloneSchedule(change.schedule),
      })),
    })),
    entries: data.entries.map((entry) => ({ ...entry })),
  };
}

function isPreviousHabit(value: unknown): value is PreviousHabit {
  return (
    isRecord(value) &&
    !("createdOn" in value) &&
    !("archivedOn" in value) &&
    !("activePeriods" in value) &&
    !("scheduleHistory" in value) &&
    isPositiveInteger(value.id) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.trim().length <= 80
  );
}

function isPreviousData(value: unknown): value is PreviousData {
  if (
    !isRecord(value) ||
    !Array.isArray(value.habits) ||
    value.habits.length > MAX_HABITS ||
    !value.habits.every(isPreviousHabit) ||
    !Array.isArray(value.entries) ||
    value.entries.length > MAX_ENTRIES ||
    !value.entries.every(isHabitEntry)
  ) {
    return false;
  }

  const habitIds = value.habits.map((habit) => habit.id);
  const validHabitIds = new Set(habitIds);

  return (
    validHabitIds.size === habitIds.length &&
    value.entries.every((entry) => validHabitIds.has(entry.habitId))
  );
}

function isLegacyHabit(value: unknown): value is LegacyHabit {
  if (!isRecord(value) || !isPreviousHabit(value)) {
    return false;
  }

  return "completed" in value && typeof value.completed === "boolean";
}

function deduplicateEntries(entries: HabitEntry[]): HabitEntry[] {
  const entriesByKey = new Map<string, HabitEntry>();

  for (const entry of entries) {
    entriesByKey.set(`${entry.habitId}:${entry.date}`, { ...entry });
  }

  return [...entriesByKey.values()];
}

function migratePreviousData(
  previousData: PreviousData,
  todayKey: string,
): HabitTrackerData {
  const entries = deduplicateEntries(previousData.entries);
  const firstGlobalKnownDate =
    entries.map((entry) => entry.date).sort()[0] ?? todayKey;

  return {
    version: 2,
    habits: previousData.habits.map((habit, index) => {
      const firstKnownDate =
        entries
          .filter((entry) => entry.habitId === habit.id)
          .map((entry) => entry.date)
          .sort()[0] ?? firstGlobalKnownDate;
      const schedule = createSchedule("daily");

      return {
        id: habit.id,
        name: habit.name.trim(),
        category: DEFAULT_CATEGORY,
        createdOn: firstKnownDate,
        archivedOn: null,
        activePeriods: [
          { startedOn: firstKnownDate, endedOn: null },
        ],
        schedule,
        scheduleHistory: [
          { startedOn: firstKnownDate, schedule: cloneSchedule(schedule) },
        ],
        order: index,
      };
    }),
    entries,
  };
}

function migrateLegacyHabits(
  legacyHabits: LegacyHabit[],
  todayKey: string,
): HabitTrackerData {
  const previousData: PreviousData = {
    habits: legacyHabits.map((habit) => ({
      id: habit.id,
      name: habit.name,
    })),
    entries: legacyHabits
      .filter((habit) => habit.completed)
      .map((habit) => ({
        habitId: habit.id,
        date: todayKey,
        completed: true,
      })),
  };

  return migratePreviousData(previousData, todayKey);
}

export function normalizeTrackerData(
  value: unknown,
  todayKey: string,
): HabitTrackerData | null {
  const candidate = value;

  if (
    isRecord(candidate) &&
    ("format" in candidate ||
      "schemaVersion" in candidate ||
      "data" in candidate)
  ) {
    if (
      candidate.format !== "habit-tracker-backup" ||
      candidate.schemaVersion !== 2 ||
      !("data" in candidate) ||
      !isVersionTwoData(candidate.data)
    ) {
      return null;
    }

    return cloneData(candidate.data);
  }

  if (isRecord(candidate) && "version" in candidate) {
    return isVersionTwoData(candidate) ? cloneData(candidate) : null;
  }

  if (isPreviousData(candidate)) {
    return migratePreviousData(candidate, todayKey);
  }

  if (
    Array.isArray(candidate) &&
    candidate.length <= MAX_HABITS &&
    candidate.every(isLegacyHabit)
  ) {
    return migrateLegacyHabits(candidate, todayKey);
  }

  return null;
}

function createStarterHabit(
  id: number,
  name: string,
  category: string,
  order: number,
  todayKey: string,
): Habit {
  const schedule = createSchedule("daily");

  return {
    id,
    name,
    category,
    createdOn: todayKey,
    archivedOn: null,
    activePeriods: [{ startedOn: todayKey, endedOn: null }],
    schedule,
    scheduleHistory: [
      { startedOn: todayKey, schedule: cloneSchedule(schedule) },
    ],
    order,
  };
}

export function createInitialData(todayKey: string): HabitTrackerData {
  return {
    version: 2,
    habits: [
      createStarterHabit(1, "Read 20 minutes", "Learning", 0, todayKey),
      createStarterHabit(2, "Exercise", "Health", 1, todayKey),
      createStarterHabit(3, "Meditate", "Mindfulness", 2, todayKey),
      createStarterHabit(4, "Take vitamins", "Health", 3, todayKey),
    ],
    entries: [],
  };
}

export function createEmptyData(): HabitTrackerData {
  return {
    version: 2,
    habits: [],
    entries: [],
  };
}

export function getScheduleForDate(
  habit: Habit,
  dateKey: string,
): HabitSchedule {
  for (let index = habit.scheduleHistory.length - 1; index >= 0; index--) {
    const change = habit.scheduleHistory[index];

    if (change.startedOn <= dateKey) {
      return change.schedule;
    }
  }

  return habit.scheduleHistory[0].schedule;
}

export function isHabitActiveOnDate(
  habit: Habit,
  dateKey: string,
): boolean {
  return habit.activePeriods.some(
    (period) =>
      period.startedOn <= dateKey &&
      (period.endedOn === null || dateKey <= period.endedOn),
  );
}

export function isHabitDueOnDate(
  habit: Habit,
  dateKey: string,
): boolean {
  return (
    isHabitActiveOnDate(habit, dateKey) &&
    getScheduleForDate(habit, dateKey).days.includes(
      getWeekday(dateKey),
    )
  );
}

export function getHabitsDueOnDate(
  data: HabitTrackerData,
  dateKey: string,
): Habit[] {
  return data.habits
    .filter((habit) => isHabitDueOnDate(habit, dateKey))
    .sort(
      (first, second) =>
        first.order - second.order || first.id - second.id,
    );
}

export function getCompletedHabitIds(
  data: HabitTrackerData,
  dateKey: string,
): Set<number> {
  return new Set(
    data.entries
      .filter((entry) => entry.date === dateKey && entry.completed)
      .map((entry) => entry.habitId),
  );
}

export function getDayStats(
  data: HabitTrackerData,
  dateKey: string,
): DayStats {
  const dueHabits = getHabitsDueOnDate(data, dateKey);
  const completedIds = getCompletedHabitIds(data, dateKey);
  const completedCount = dueHabits.filter((habit) =>
    completedIds.has(habit.id),
  ).length;
  const dueCount = dueHabits.length;

  return {
    dateKey,
    dueCount,
    completedCount,
    percentage:
      dueCount === 0 ? 0 : Math.round((completedCount / dueCount) * 100),
    fullyCompleted: dueCount > 0 && completedCount === dueCount,
  };
}

export function getSevenDayStats(
  data: HabitTrackerData,
  endDateKey: string,
): {
  days: DayStats[];
  dueCount: number;
  completedCount: number;
  percentage: number;
} {
  const days = Array.from({ length: 7 }, (_, index) =>
    getDayStats(data, shiftDateKey(endDateKey, index - 6)),
  );
  const dueCount = days.reduce((total, day) => total + day.dueCount, 0);
  const completedCount = days.reduce(
    (total, day) => total + day.completedCount,
    0,
  );

  return {
    days,
    dueCount,
    completedCount,
    percentage:
      dueCount === 0 ? 0 : Math.round((completedCount / dueCount) * 100),
  };
}

function getDateRange(startDateKey: string, endDateKey: string): string[] {
  if (startDateKey > endDateKey) {
    return [];
  }

  const dateKeys: string[] = [];
  let dateKey = startDateKey;

  while (dateKey <= endDateKey && dateKeys.length < MAX_STATS_DAYS) {
    dateKeys.push(dateKey);
    dateKey = shiftDateKey(dateKey, 1);
  }

  return dateKeys;
}

function calculateStreaks(
  dueDates: Array<{ dateKey: string; completed: boolean }>,
  todayKey: string,
): StreakStats {
  let running = 0;
  let best = 0;

  for (const day of dueDates) {
    if (day.completed) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  let currentIndex = dueDates.length - 1;

  if (
    currentIndex >= 0 &&
    dueDates[currentIndex].dateKey === todayKey &&
    !dueDates[currentIndex].completed
  ) {
    currentIndex -= 1;
  }

  let current = 0;

  for (let index = currentIndex; index >= 0; index--) {
    if (!dueDates[index].completed) {
      break;
    }

    current += 1;
  }

  return { current, best };
}

function getFirstTrackedDate(
  data: HabitTrackerData,
  todayKey: string,
): string {
  const firstDate = data.habits
    .flatMap((habit) => habit.activePeriods.map((period) => period.startedOn))
    .sort()[0];

  if (firstDate === undefined) {
    return todayKey;
  }

  const earliestAllowed = shiftDateKey(todayKey, -(MAX_STATS_DAYS - 1));

  return firstDate < earliestAllowed ? earliestAllowed : firstDate;
}

export function getTrackerStreaks(
  data: HabitTrackerData,
  todayKey: string,
): StreakStats {
  const completedEntryKeys = new Set(
    data.entries
      .filter((entry) => entry.completed)
      .map((entry) => `${entry.habitId}:${entry.date}`),
  );
  const dueDates = getDateRange(
    getFirstTrackedDate(data, todayKey),
    todayKey,
  )
    .map((dateKey) => {
      let dueCount = 0;
      let completedCount = 0;

      for (const habit of data.habits) {
        if (!isHabitDueOnDate(habit, dateKey)) {
          continue;
        }

        dueCount += 1;

        if (completedEntryKeys.has(`${habit.id}:${dateKey}`)) {
          completedCount += 1;
        }
      }

      return {
        dateKey,
        dueCount,
        completed: dueCount > 0 && completedCount === dueCount,
      };
    })
    .filter((day) => day.dueCount > 0);

  return calculateStreaks(dueDates, todayKey);
}

export function getHabitStreaks(
  data: HabitTrackerData,
  habit: Habit,
  todayKey: string,
): StreakStats {
  const completedDateKeys = new Set(
    data.entries
      .filter((entry) => entry.habitId === habit.id && entry.completed)
      .map((entry) => entry.date),
  );
  const firstDate = habit.activePeriods[0]?.startedOn ?? todayKey;
  const earliestAllowed = shiftDateKey(todayKey, -(MAX_STATS_DAYS - 1));
  const startDate = firstDate < earliestAllowed ? earliestAllowed : firstDate;
  const dueDates: Array<{ dateKey: string; completed: boolean }> = [];
  let hasSeenActiveDate = false;
  let crossedInactiveGap = false;

  for (const dateKey of getDateRange(startDate, todayKey)) {
    const isActive = isHabitActiveOnDate(habit, dateKey);

    if (!isActive) {
      if (hasSeenActiveDate) {
        crossedInactiveGap = true;
      }

      continue;
    }

    if (crossedInactiveGap) {
      dueDates.push({
        dateKey: shiftDateKey(dateKey, -1),
        completed: false,
      });
      crossedInactiveGap = false;
    }

    hasSeenActiveDate = true;

    if (isHabitDueOnDate(habit, dateKey)) {
      dueDates.push({
        dateKey,
        completed: completedDateKeys.has(dateKey),
      });
    }
  }

  if (crossedInactiveGap) {
    dueDates.push({
      dateKey: shiftDateKey(todayKey, -1),
      completed: false,
    });
  }

  return calculateStreaks(dueDates, todayKey);
}
