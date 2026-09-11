import {
  InboxFilter,
  Severity,
  SourceEvent,
  SourceModule,
  SubjectType,
} from './enums';

export type InboxItem = {
  id: string;
  sourceModule: SourceModule;
  sourceEvent: SourceEvent;
  sourceRef: string;
  subjectType: SubjectType;
  subjectRef: string | null;
  severity: Severity;
  title: string;
  body: string;
  dedupeKey: string;
  createdAt: Date;
  expiresAt: Date | null;
};

export type IngestCommand = {
  sourceModule: SourceModule;
  sourceEvent: SourceEvent;
  sourceRef: string;
  subjectType: SubjectType;
  subjectRef: string | null;
  severity: Severity;
  title: string;
  body: string;
  dedupeKey: string;
  createdAt?: Date;
};

export type InboxListItem = InboxItem & {
  readAt: Date | null;
  deeplinkPath: string;
};

export type StockBajoInput = {
  itemId: string;
  sku: string;
  nombre: string;
};

export interface InboxStore {
  findByDedupe(key: string): Promise<InboxItem | null>;
  findById(id: string): Promise<InboxItem | null>;
  save(item: InboxItem): Promise<void>;
  listActive(now: Date): Promise<InboxItem[]>;
  getReadAt(userId: string, itemId: string): Promise<Date | null>;
  getReads(userId: string): Promise<Map<string, Date>>;
  saveRead(itemId: string, userId: string, readAt: Date): Promise<void>;
  clearReads(itemId: string): Promise<void>;
}

export type InboxEngineDeps = {
  store: InboxStore;
  now?: () => Date;
  newId?: () => string;
};

export type { InboxFilter };
