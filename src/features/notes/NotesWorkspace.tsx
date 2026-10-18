import type * as React from 'react'
import { getAttachmentBlob, putAttachmentBlob } from '../../db/calendar'
import { cascadeTrashNoteFocus } from '../../domain/noteFocusLifecycle'
import type { Attachment, FocusSession, Note, Notebook, Tag } from '../../types'
import type { MainView } from '../navigation/navigationTypes'
import { NotesPage } from './NotesPage'

export interface NotesWorkspaceProps {
  activeFocusElapsed: number
  activeFocusNote: Note | null
  activeFocusSession: FocusSession | null
  addNoteImages: (noteId: string, files: FileList | null) => Promise<void>
  formatUiDate: (date: Date) => string
  mainView: MainView
  noteFocusSecondsById: { [k: string]: number; }
  notebooks: Notebook[]
  notes: Note[]
  openImagePreview: (attachment: Attachment, gallery?: Attachment[]) => Promise<void>
  requestNoteFocus: (note: Note) => void
  requestedNoteId: string | null
  setFocusEditId: React.Dispatch<React.SetStateAction<string | null>>
  setFocusSessions: React.Dispatch<React.SetStateAction<FocusSession[]>>
  setImageLibraryNoteId: React.Dispatch<React.SetStateAction<string | null>>
  setImageLibraryTarget: React.Dispatch<React.SetStateAction<"task" | "note" | "journal" | null>>
  setNoteFocusHistoryId: React.Dispatch<React.SetStateAction<string | null>>
  setNotebooks: React.Dispatch<React.SetStateAction<Notebook[]>>
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  setRequestedNoteId: React.Dispatch<React.SetStateAction<string | null>>
  stopNoteFocus: (note: Note, forcedEndMs?: number | undefined) => void
  tags: Tag[]
}

export function NotesWorkspace({
  activeFocusElapsed,
  activeFocusNote,
  activeFocusSession,
  addNoteImages,
  formatUiDate,
  mainView,
  noteFocusSecondsById,
  notebooks,
  notes,
  openImagePreview,
  requestNoteFocus,
  requestedNoteId,
  setFocusEditId,
  setFocusSessions,
  setImageLibraryNoteId,
  setImageLibraryTarget,
  setNoteFocusHistoryId,
  setNotebooks,
  setNotes,
  setRequestedNoteId,
  stopNoteFocus,
  tags
}: NotesWorkspaceProps) {
  return <>
{mainView === 'notes' && <NotesPage notes={notes} notebooks={notebooks} tags={tags} setNotes={setNotes} setNotebooks={setNotebooks} requestedNoteId={requestedNoteId} onRequestedNoteHandled={()=>setRequestedNoteId(null)} onAddImages={addNoteImages} onOpenImageLibrary={noteId=>{setImageLibraryNoteId(noteId);setImageLibraryTarget('note')}} putAttachmentBlob={putAttachmentBlob} getAttachmentBlob={getAttachmentBlob} onPreviewImage={attachment=>void openImagePreview(attachment)} formatUiDate={formatUiDate} focusSecondsByNoteId={noteFocusSecondsById} activeFocusNoteId={activeFocusNote?.id} focusBusy={Boolean(activeFocusSession)} activeFocusElapsed={activeFocusElapsed} onStartNoteFocus={requestNoteFocus} onStopNoteFocus={stopNoteFocus} onOpenFocusHistory={note=>{setFocusEditId(null);setNoteFocusHistoryId(note.id)}} onTrashNote={note=>{const now=new Date().toISOString();setNotes(current=>current.map(row=>row.id===note.id?{...row,trashedAt:now,updatedAt:now}:row));setFocusSessions(current=>cascadeTrashNoteFocus(current,note.id,now))}} />}
  </>
}
