import { Repository } from 'typeorm';
import { MSG_INACTIVAR_ASIGNADO } from '../logistica/logistica-rules';
import { Unidad } from '../unidades/unidad.entity';
import { Chofer } from './chofer.entity';
import { ChoferesService } from './choferes.service';
import { EstadoChofer } from './estado-chofer.enum';

const C1 = '22222222-2222-4222-8222-222222222221';
const U1 = '11111111-1111-4111-8111-111111111111';

describe('ChoferesService L3 soft-block (unidad.choferId)', () => {
  function service(opts: {
    chofer: Chofer;
    assignedUnidad: Pick<Unidad, 'id' | 'choferId'> | null;
  }) {
    const saved: Chofer[] = [];
    const repo = {
      findOne: async () => opts.chofer,
      save: async (entity: Chofer) => {
        saved.push(entity);
        return entity;
      },
    } as unknown as Repository<Chofer>;
    const unidades = {
      findOne: async ({ where }: { where: { choferId: string } }) => {
        if (opts.assignedUnidad?.choferId !== where.choferId) return null;
        return opts.assignedUnidad;
      },
    } as unknown as Repository<Unidad>;
    return { svc: new ChoferesService(repo, unidades), saved };
  }

  it('no pasa a INACTIVO mientras unidad.choferId apunta al chofer', async () => {
    const chofer = {
      id: C1,
      nombre: 'WERO',
      estado: EstadoChofer.ACTIVO,
    } as Chofer;
    const { svc, saved } = service({
      chofer,
      assignedUnidad: { id: U1, choferId: C1 },
    });

    await expect(
      svc.update(C1, { estado: EstadoChofer.INACTIVO }),
    ).rejects.toThrow(MSG_INACTIVAR_ASIGNADO);
    expect(saved).toHaveLength(0);
    expect(chofer.estado).toBe(EstadoChofer.ACTIVO);
  });

  it('sí inactiva cuando ninguna unidad.choferId apunta al chofer', async () => {
    const chofer = {
      id: C1,
      nombre: 'WERO',
      estado: EstadoChofer.ACTIVO,
    } as Chofer;
    const { svc, saved } = service({ chofer, assignedUnidad: null });

    const updated = await svc.update(C1, { estado: EstadoChofer.INACTIVO });
    expect(updated.estado).toBe(EstadoChofer.INACTIVO);
    expect(saved).toHaveLength(1);
  });
});
