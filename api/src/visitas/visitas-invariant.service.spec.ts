import { DataSource } from 'typeorm';
import { VisitasInvariantService } from './visitas-invariant.service';

describe('VisitasInvariantService', () => {
  it('audita antes de instalar el índice parcial', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = new VisitasInvariantService({ query } as unknown as DataSource);

    await service.ensureSingleDraftPerUnidad();

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("HAVING COUNT(*) > 1");
    expect(query.mock.calls[1][0]).toContain('CREATE UNIQUE INDEX IF NOT EXISTS');
    expect(query.mock.calls[1][0]).toContain("WHERE estado = 'BORRADOR'");
  });

  it('reporta duplicados y no ejecuta DDL ni mutaciones', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        unidad_id: 'unidad-1',
        visita_ids: ['visita-1', 'visita-2'],
      },
    ]);
    const service = new VisitasInvariantService({ query } as unknown as DataSource);

    await expect(service.ensureSingleDraftPerUnidad()).rejects.toThrow(
      /unidad-1: visita-1, visita-2/,
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});
