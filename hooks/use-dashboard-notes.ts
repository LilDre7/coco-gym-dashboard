"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDashboardNoteId,
  type DashboardNote,
  readDashboardNotes,
  sortDashboardNotes,
  writeDashboardNotes,
} from "@/lib/dashboard-notes";

type DashboardNoteInput = {
  title: string;
  body: string;
};

export function useDashboardNotes() {
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setNotes(sortDashboardNotes(readDashboardNotes()));
    setIsReady(true);
  }, []);

  const persistNotes = useCallback((nextNotes: DashboardNote[]) => {
    const sortedNotes = sortDashboardNotes(nextNotes);
    setNotes(sortedNotes);
    writeDashboardNotes(sortedNotes);
    return sortedNotes;
  }, []);

  const addNote = useCallback(
    (input: DashboardNoteInput) => {
      const trimmedTitle = input.title.trim();
      const trimmedBody = input.body.trim();
      if (!trimmedTitle && !trimmedBody) return null;

      const timestamp = new Date().toISOString();
      const nextNote: DashboardNote = {
        id: createDashboardNoteId(),
        title: trimmedTitle || "Sin titulo",
        body: trimmedBody,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      persistNotes([nextNote, ...notes]);
      return nextNote;
    },
    [notes, persistNotes]
  );

  const updateNote = useCallback(
    (id: string, input: DashboardNoteInput) => {
      const trimmedTitle = input.title.trim();
      const trimmedBody = input.body.trim();
      if (!trimmedTitle && !trimmedBody) return null;

      const existingNote = notes.find((note) => note.id === id);
      if (!existingNote) return null;

      const updatedNote: DashboardNote = {
        ...existingNote,
        title: trimmedTitle || "Sin titulo",
        body: trimmedBody,
        updatedAt: new Date().toISOString(),
      };
      const nextNotes = notes.map((note) =>
        note.id === id ? updatedNote : note
      );

      persistNotes(nextNotes);
      return updatedNote;
    },
    [notes, persistNotes]
  );

  const deleteNote = useCallback(
    (id: string) => {
      persistNotes(notes.filter((note) => note.id !== id));
    },
    [notes, persistNotes]
  );

  return {
    notes,
    isReady,
    addNote,
    updateNote,
    deleteNote,
  };
}
