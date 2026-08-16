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
}