import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { ObjectStoragePort, StoredObject } from './object-storage.port';

@Injectable()
export class PrivateFilesystemStorageAdapter extends ObjectStoragePort {
  private readonly root: string | null;
  constructor(config: ConfigService) {
    super();
    this.root = config.get('CHECK_STORAGE_PROVIDER') === 'filesystem'
      ? config.get<string>('CHECK_STORAGE_ROOT')?.trim() || null
      : null;
  }

  private path(key: string) {
    if (!this.root) throw new ServiceUnavailableException({ code: 'PRIVATE_STORAGE_UNAVAILABLE', message: 'El storage privado CHECK no está configurado.', details: {} });
    if (!/^[a-zA-Z0-9/_-]+$/.test(key)) throw new Error('INVALID_STORAGE_KEY');
    const root = resolve(this.root);
    const target = resolve(join(root, key));
    if (!target.startsWith(`${root}/`)) throw new Error('INVALID_STORAGE_KEY');
    return target;
  }

  private metadata(key: string, content: Buffer): StoredObject {
    const sha256 = createHash('sha256').update(content).digest('hex');
    return { key, versionId: sha256, bytes: content.byteLength, sha256 };
  }

  async putTemporary(key: string, content: Buffer) {
    const target = this.path(key);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, content, { flag: 'wx', mode: 0o600 });
    return this.metadata(key, content);
  }

  async referenceImmutableObject(temporaryKey: string, finalKey: string) {
    const content = await readFile(this.path(temporaryKey));
    const target = this.path(finalKey);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    try {
      await writeFile(target, content, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await readFile(target);
      if (this.metadata(finalKey, existing).sha256 !== this.metadata(finalKey, content).sha256)
        throw new Error('IMMUTABLE_OBJECT_CONFLICT');
    }
    await unlink(this.path(temporaryKey));
    return this.metadata(finalKey, content);
  }

  readPrivate(key: string) {
    return readFile(this.path(key));
  }

  async removeUnreferencedTemporary(key: string) {
    if (!key.includes('/temporary/')) throw new Error('REFUSING_NON_TEMPORARY_DELETE');
    try { await unlink(this.path(key)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
