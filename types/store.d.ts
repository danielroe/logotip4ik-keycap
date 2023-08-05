import type { Note, Folder } from '@prisma/client'
import type { Remote } from 'comlink'

import type { SearchAction, SearchActionValues } from '~/types/common'

interface _IFuzzyWorker {
  searchWithQuery: (query: string, maxLength = 4) => FuzzyItem[]
  addItemToCache: (item: FuzzyItem) => void
  addItemsToCache: (items: FuzzyItem[]) => void
  refreshItemsCache: () => Promise<void>
}

declare global {
  export type NoteMinimal = Pick<Note, 'id' | 'name' | 'path'> & {
    content?: string
    editing?: boolean
    creating?: boolean
  };

  export interface FolderWithContents extends Omit<Folder, 'createdAt' | 'updatedAt'> {
    editing?: boolean
    creating?: boolean
    notes: NoteMinimal[]
    subfolders: FolderWithContents[]
  }

  export type FolderOrNote = FolderWithContents & NoteMinimal;

  export interface CommandItem {
    name: string
    key: SearchActionValues
  }

  export type FuzzyItem = Pick<FolderOrNote, 'name' | 'path' | 'root'>;

  export interface IFuzzyWorker extends Remote<_IFuzzyWorker> {
  }

  export interface OfflineStorage {
    setItem: <T = any>(key: string, value: T) => Promise<void>
    getItem: <T = any>(key: string) => Promise<T | undefined>
    removeItem: (key: string) => Promise<void>
    getAllItems: <T = any>() => Promise<T[]>
  }
}

export {}
