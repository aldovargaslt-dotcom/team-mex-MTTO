import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmbitoUnidad } from '../unidades/ambito-unidad.enum';
import { ReglaFlotaSinRegresoEntity } from './entities/regla-flota-sin-regreso.entity';
import { UmbralUnidadEntity } from './entities/umbral-unidad.entity';
import {
  DEFAULT_UMBRAL_FORANEO_H,
  DEFAULT_UMBRAL_LOCAL_H,
} from './enums';
import { resolveUmbralHoras } from './umbral-rules';

export type AlertasSinRegresoConfig = {
  localH: number;
  foraneoH: number;
  umbrales: { unidadId: string; horas: number }[];
};

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(ReglaFlotaSinRegresoEntity)
    private readonly reglas: Repository<ReglaFlotaSinRegresoEntity>,
    @InjectRepository(UmbralUnidadEntity)
    private readonly umbrales: Repository<UmbralUnidadEntity>,
  ) {}

  async resolveUmbralHoras(unidad: {
    id: string;
    ambito: AmbitoUnidad | 'LOCAL' | 'FORANEO';
  }): Promise<number> {
    const [regla, override] = await Promise.all([
      this.ensureRegla(),
      this.umbrales.findOne({ where: { unidadId: unidad.id } }),
    ]);
    return resolveUmbralHoras({
      ambito: unidad.ambito === AmbitoUnidad.FORANEO ? 'FORANEO' : 'LOCAL',
      overrideHoras: override?.horas ?? null,
      defaultLocalH: regla.ambitoDefaultLocalH,
      defaultForaneoH: regla.ambitoDefaultForaneoH,
    });
  }

  async getConfig(): Promise<AlertasSinRegresoConfig> {
    const regla = await this.ensureRegla();
    const rows = await this.umbrales.find({ order: { unidadId: 'ASC' } });
    return {
      localH: regla.ambitoDefaultLocalH,
      foraneoH: regla.ambitoDefaultForaneoH,
      umbrales: rows.map((row) => ({
        unidadId: row.unidadId,
        horas: row.horas,
      })),
    };
  }

  async patchConfig(input: {
    localH?: number;
    foraneoH?: number;
    umbrales?: { unidadId: string; horas: number | null }[];
  }): Promise<AlertasSinRegresoConfig> {
    const regla = await this.ensureRegla();
    if (input.localH != null) {
      regla.ambitoDefaultLocalH = input.localH;
    }
    if (input.foraneoH != null) {
      regla.ambitoDefaultForaneoH = input.foraneoH;
    }
    await this.reglas.save(regla);

    if (input.umbrales) {
      for (const item of input.umbrales) {
        if (item.horas == null) {
          await this.umbrales.delete({ unidadId: item.unidadId });
          continue;
        }
        await this.umbrales.save(
          this.umbrales.create({
            unidadId: item.unidadId,
            horas: item.horas,
          }),
        );
      }
    }

    return this.getConfig();
  }

  private async ensureRegla(): Promise<ReglaFlotaSinRegresoEntity> {
    const existing = await this.reglas.find({ take: 1 });
    if (existing[0]) return existing[0];
    return this.reglas.save(
      this.reglas.create({
        ambitoDefaultLocalH: DEFAULT_UMBRAL_LOCAL_H,
        ambitoDefaultForaneoH: DEFAULT_UMBRAL_FORANEO_H,
      }),
    );
  }
}
