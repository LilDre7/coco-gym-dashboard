"use client";

import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardNotes } from "@/hooks/use-dashboard-notes";
import { trackEvent } from "@/lib/analytics";
import {
  formatDashboardNoteDate,
  type DashboardNote,
} from "@/lib/dashboard-notes";
import { cn } from "@/lib/utils";
import {
  NotebookPen,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type NoteFormState = {
  title: string;
  body: string;
};

function createEmptyFormState(): NoteFormState {
  return {
    title: "",
    body: "",
  };
}

function getNotePreview(body: string, maxLength = 160): string {
  const normalized = body.trim().replace(/\s+/g, " ");
  if (!normalized) return "Sin contenido";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function DashboardNotesPage() {
  const { notes, isReady, addNote, updateNote, deleteNote } =
    useDashboardNotes();
  const [search, setSearch] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DashboardNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<DashboardNote | null>(null);
  const [formState, setFormState] = useState<NoteFormState>(
    createEmptyFormState(),
  );

  const filteredNotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return notes;

    return notes.filter((note) => {
      const haystack = `${note.title} ${note.body}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [notes, search]);

  function openCreateDialog() {
    setEditingNote(null);
    setFormState(createEmptyFormState());
    setIsEditorOpen(true);
    trackEvent("dashboard_notes_create_opened");
  }

  function openEditDialog(note: DashboardNote) {
    setEditingNote(note);
    setFormState({
      title: note.title,
      body: note.body,
    });
    setIsEditorOpen(true);
    trackEvent("dashboard_notes_edit_opened", {
      note_id: note.id,
    });
  }

  function closeEditorDialog() {
    setIsEditorOpen(false);
    setEditingNote(null);
    setFormState(createEmptyFormState());
  }

  function handleSaveNote() {
    if (!formState.title.trim() && !formState.body.trim()) {
      toast.error("Escribe un titulo o contenido para guardar la nota");
      return;
    }

    if (editingNote) {
      const updated = updateNote(editingNote.id, formState);
      if (!updated) return;

      trackEvent("dashboard_notes_updated", {
        note_id: updated.id,
      });
      toast.success("Nota actualizada");
    } else {
      const created = addNote(formState);
      if (!created) return;

      trackEvent("dashboard_notes_created", {
        note_id: created.id,
      });
      toast.success("Nota guardada en este navegador");
    }

    closeEditorDialog();
  }

  function handleConfirmDelete() {
    if (!noteToDelete) return;

    deleteNote(noteToDelete.id);
    trackEvent("dashboard_notes_deleted", {
      note_id: noteToDelete.id,
    });
    toast.success("Nota eliminada");
    setNoteToDelete(null);
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-10 sm:p-6 lg:space-y-8 lg:p-8">
      <div className="space-y-2">
        <div className="bg-primary text-white rounded-full px-3 py-1 text-xs font-medium mx-auto w-fit">
          Solo en este navegador
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
            Notas
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Anota recordatorios, pendientes o detalles del gym.
            <span className="font-semibold text-foreground font-mono text-xs" > Se guardan localmente en este dispositivo.</span>
          </p> 
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar notas..."
            className="h-11 rounded-2xl border-border bg-background pl-11 shadow-none"
          />
        </div>
        <Button
          type="button"
          className="h-11 rounded-2xl bg-primary px-4 text-primary-foreground hover:bg-primary/90"
          onClick={openCreateDialog}
        >
          <Plus className="h-4 w-4" />
          Nueva nota
        </Button>
      </div>

      {!isReady ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          Cargando notas...
        </div>
      ) : filteredNotes.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed border-border bg-card/40 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StickyNote className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle>
              {search.trim()
                ? "No hay notas con ese filtro"
                : "Aun no tienes notas"}
            </EmptyTitle>
            <EmptyDescription>
              {search.trim()
                ? "Prueba con otro termino de busqueda."
                : "Crea tu primera nota para llevar control rapido desde el dashboard."}
            </EmptyDescription>
          </EmptyHeader>
          {!search.trim() ? (
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Crear nota
            </Button>
          ) : null}
        </Empty>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => (
            <article
              key={note.id}
              className={cn(
                "group flex min-h-[220px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/25 hover:bg-card/90",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
                    <NotebookPen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">
                      {note.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Actualizada {formatDashboardNoteDate(note.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => openEditDialog(note)}
                    aria-label={`Editar ${note.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => setNoteToDelete(note)}
                    aria-label={`Eliminar ${note.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {getNotePreview(note.body)}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                <span className="text-xs text-muted-foreground">
                  Creada {formatDashboardNoteDate(note.createdAt)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => openEditDialog(note)}
                >
                  Abrir
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          if (!open) closeEditorDialog();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Editar nota" : "Nueva nota"}
            </DialogTitle>
            <DialogDescription>
              Esta nota se guarda solo en el navegador de este equipo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Titulo</Label>
              <Input
                id="note-title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Ej. Pendientes de la semana"
                className="rounded-xl border-border bg-background shadow-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-body">Contenido</Label>
              <Textarea
                id="note-body"
                value={formState.body}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="Escribe aqui lo que quieras recordar..."
                rows={8}
                className="resize-y rounded-2xl border-border bg-background shadow-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={closeEditorDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveNote}>
              {editingNote ? "Guardar cambios" : "Guardar nota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(noteToDelete)}
        onOpenChange={(open) => {
          if (!open) setNoteToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nota</AlertDialogTitle>
            <AlertDialogDescription>
              {noteToDelete
                ? `Se eliminara "${noteToDelete.title}" de este navegador. Esta accion no se puede deshacer.`
                : "Se eliminara la nota de este navegador."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
