export type StoredObject = {
  key: string;
  versionId: string;
  bytes: number;
  sha256: string;
};

export abstract class ObjectStoragePort {
  abstract putTemporary(key: string, content: Buffer): Promise<StoredObject>;
  abstract referenceImmutableObject(
    temporaryKey: string,
    finalKey: string,
  ): Promise<StoredObject>;
  abstract readPrivate(key: string): Promise<Buffer>;
  abstract removeUnreferencedTemporary(key: string): Promise<void>;
}
