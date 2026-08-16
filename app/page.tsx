/*/
Composant interactif : autorise les fonctionnalités exécutées dans le navigateur : useState, clics, saisie, etc.
Next.js peut quand même prégénérer le HJTML in itial, puis React rend la page interactive dans le navigateur : c'est l'hydratation.
/*/
"use client";
/*/
- useState conserve une valeur entre les rendus React
- SubmitEvent décrit uniqueent ^pour TypeScript le type d'un evnt de formulaire
- type précise que cet import disparaîtra après la compilation vers JavaScript
/*/
import { startTransition, useEffect, useState, type SubmitEvent } from "react";



//définition du type Habit : c'est la structure obligatoire de chaque habitude manipulée par l'aplication
type Habit = {
  id: number;
  name: string;
  completed: boolean;
};

//Habitudes affichées lors du premier chargement de la page
const initialHabits: Habit[] = [
  { id: 1, name: "Read 20 minutes", completed: false },
  { id: 2, name: "Exercise", completed: false },
  { id: 3, name: "Meditate", completed: false },
  { id: 4, name: "Take vitamins", completed: false },
];

//Nom utilisé pour stocker les habitudes dans le navigateur
const STORAGE_KEY = "habit-tracker-habits";

function saveHabits(habitsToSave: Habit[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(habitsToSave),
  );
}


// Vérifie qu'une valeur possède réellement la structure d'une habitude
function isHabit(value: unknown): value is Habit {
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

// Lit et reconvertit les habitudes sauvegardées
function loadHabits(): Habit[] | null {
  const savedHabits = localStorage.getItem(STORAGE_KEY);

  if (savedHabits === null) {
    return null;
  }

  try {
    const parsedData: unknown = JSON.parse(savedHabits);

    if (
      !Array.isArray(parsedData) ||
      !parsedData.every(isHabit)
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsedData;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export default function Home() {

  //Liste des habitudes actuellement affichées
  const [habits, setHabits] = useState(initialHabits);


  // Restaure les habitudes sauvegardées après le premier affichage
  useEffect(() => {
    const savedHabits = loadHabits();

    if (savedHabits === null) {
      return;
    }

    startTransition(() => {
      setHabits(savedHabits);
    });
  }, []);

  /*/
  - Texte actuellement saisi dans le champ d'ajout
  - Chaque useState retourne actuellement 2 elts :
    - la valeur actuelle;
    - une fonction permettant de le remplacer.
  Quand on appelle un setter comme setHabits, React mémorise la nouvelle valeur et réexécute  Home pour actualiser l'interface  
  /*/
  const [newHabitName, setNewHabitName] = useState("");


  // Valeurs calculées à partir de la liste actuelle
  const completedHabitsCount = habits.filter(
    (habit) => habit.completed,
  ).length;

  const completionPercentage =
    habits.length === 0
      ? 0
      : (completedHabitsCount / habits.length) * 100;

  //fonctions

  //Valide le formulaire et ajoute une nouvelle habitude à la liste
  function addHabit(event: SubmitEvent<HTMLFormElement>) {
    //Empêche le rechargement automatique de la page
    event.preventDefault();

    //Retire les espaces placés avant et après le nom
    const name = newHabitName.trim();

    //Refuse les habitudes dont le nom est vide
    if (name === "") {
      return;
    }

    //Construit une nouvelle habitude conforme au type Habit
    const newHabit: Habit = {
      id: Date.now(),
      name: name,
      completed: false,
    };

    //Crée un nouveau contenant les nouvelles habitudes et les anciennes
    const updatedHabits = [...habits, newHabit];

    setHabits(updatedHabits);
    saveHabits(updatedHabits);


    //Vide le champ après l'ajout
    setNewHabitName("");

  }


  //Inverse la complétion de l'habit correspondant à l'identifiant reçu
  function toggleHabit(id: number) {
    const updatedHabits = habits.map(
      (habit) => {
        if (habit.id === id) {
          return { ...habit, completed: !habit.completed }; //...habit est la synthaxe spread qui crée une une copie de habit 
        }
        return habit;
      });

    setHabits(updatedHabits);
    saveHabits(updatedHabits);
  };

  //Fonction de suppression de habit
  function deleteHabit(id: number) {
    const remainingHabits = habits.filter((habit) => habit.id !== id);

    setHabits(remainingHabits);
    saveHabits(remainingHabits);
  }



  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-12 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-8">
        <div className="flex flex-col gap-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Habit Tracker
            </h1>

            <h2 className="text-base font-medium text-zinc-500 dark:text-zinc-400">
              Today
            </h2>
          </header>

          <section className="space-y-2">
            <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
              <span>Daily progress</span>
              <span>
                {completedHabitsCount} / {habits.length}
              </span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              role="progressbar"
              aria-label="Daily progress"
              aria-valuemin={0}
              aria-valuemax={habits.length}
              aria-valuenow={completedHabitsCount}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </section>

          <form className="flex gap-2" onSubmit={addHabit}>
            <input
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              type="text"
              value={newHabitName}
              onChange={(event) => setNewHabitName(event.target.value)}
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

          {habits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No habits yet. Add one above.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {habits.map((habit) => (
                <li
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                  key={habit.id}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      className="h-5 w-5 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                      type="checkbox"
                      checked={habit.completed}
                      onChange={() => toggleHabit(habit.id)}
                    />

                    <span
                      className={
                        habit.completed
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
                    onClick={() => deleteHabit(habit.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}