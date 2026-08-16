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
import { useState, type SubmitEvent } from "react";



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




export default function Home() {

  //Liste des habitudes actuellement affichées
  const [habits, setHabits] = useState(initialHabits);

  /*/
  - Texte actuellement saisi dans le champ d'ajout
  - Chaque useState retourne actuellement 2 elts :
    - la valeur actuelle;
    - une fonction permettant de le remplacer.
  Quand on appelle un setter comme setHabits, React mémorise la nouvelle valeur et réexécute  Home pour actualiser l'interface  
  /*/
  const [newHabitName, setNewHabitName] = useState("");

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
    setHabits([...habits, newHabit]);

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

    setHabits(updatedHabits)
  };

  //Fonction de suppression de habit
  function deleteHabit(id: number) {
    const remainingHabits = habits.filter((habit) => habit.id !== id);

    setHabits(remainingHabits);
  }


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

          <form onSubmit={addHabit}>
            <input
              type="text"
              value={newHabitName}
              onChange={(event) => setNewHabitName(event.target.value)}
              placeholder="New habit"
            />
            <button type="submit">Add</button>
          </form>
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
                <button type="button" onClick={() =>
                  deleteHabit(habit.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
