import { ConfigService } from '@nestjs/config';
import { mkdtemp, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrivateFilesystemStorageAdapter } from './private-filesystem-storage.adapter';

describe('PrivateFilesystemStorageAdapter', () => {
  it('writes private temporary content and promotes it without overwrite semantics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'check-storage-'));
    const config = { get: (key: string) => key === 'CHECK_STORAGE_PROVIDER' ? 'filesystem' : key === 'CHECK_STORAGE_ROOT' ? root : undefined } as ConfigService;
    const storage = new PrivateFilesystemStorageAdapter(config);
    const content = Buffer.from('private-check-object');
    const temporary = await storage.putTemporary('checks/c1/temporary/e1', content);
    const ready = await storage.referenceImmutableObject(temporary.key, 'checks/c1/evidence/e1');
    expect(ready.sha256).toBe(temporary.sha256);
    await expect(storage.readPrivate(ready.key)).resolves.toEqual(content);
    await expect(stat(join(root, ready.key))).resolves.toMatchObject({ mode: expect.any(Number) });
    await expect(storage.removeUnreferencedTemporary(ready.key)).rejects.toThrow('REFUSING_NON_TEMPORARY_DELETE');
  });

  it('allows an idempotent promotion only when immutable content is identical', async () => {
    const root = await mkdtemp(join(tmpdir(), 'check-storage-'));
    const config = { get: (key: string) => key === 'CHECK_STORAGE_PROVIDER' ? 'filesystem' : key === 'CHECK_STORAGE_ROOT' ? root : undefined } as ConfigService;
    const storage = new PrivateFilesystemStorageAdapter(config);
    const content = Buffer.from('same-signature');
    await storage.putTemporary('checks/c1/temporary/s1', content);
    await storage.referenceImmutableObject('checks/c1/temporary/s1', 'checks/c1/signatures/hash');
    await storage.putTemporary('checks/c1/temporary/s2', content);
    await expect(storage.referenceImmutableObject('checks/c1/temporary/s2', 'checks/c1/signatures/hash')).resolves.toMatchObject({ sha256: expect.any(String) });
    await storage.putTemporary('checks/c1/temporary/s3', Buffer.from('different-signature'));
    await expect(storage.referenceImmutableObject('checks/c1/temporary/s3', 'checks/c1/signatures/hash')).rejects.toThrow('IMMUTABLE_OBJECT_CONFLICT');
  });
});
