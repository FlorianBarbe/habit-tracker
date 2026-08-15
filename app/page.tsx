"use client";
//Import de la fonction useState permettant de changer l'état de complétion de nos habitudes
import { useState } from "react";

//définition du type Habit
type Habit = {
  id: number;
  name: string;
  completed: boolean;
};

//déclaration des différents habitudes
const initialHabits: Habit[] = [
  { id: 1, name: "Read 20 minutes", completed: false },
  { id: 2, name: "Exercise", completed: false },
  { id: 3, name: "Meditate", completed: false },
  { id: 4, name: "Take vitamins", completed: false },
];




export default function Home() {
  //stockage des états de chaque habitude
  const [habits, setHabits] = useState(initialHabits);

  //fonctions
  function toggleHabit(id: number) {
    const updatedHabits = habits.map(
      (habit) => {
        if (habit.id === id) {
          return { ...habit, completed: !habit.completed }; //...habit est la synthaxe spread qui crée une une copie de habit 
        }
        return habit;
      });
    //pour tester si le completed est bien modifié
    console.table(updatedHabits);

    setHabits(updatedHabits)
  };
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Habit Tracker
          </h1>

          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Today
          </h2>
          <ul>
            {habits.map((habit) => (
              <li key={habit.id}>
                <label>
                  <input type="checkbox"
                    checked={habit.completed}
                    //On rajoute un tick : dès qu'on change la vaeur de la case => appel de toggleHabit
                    onChange={() => toggleHabit(habit.id)}
                  />
                  {habit.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
