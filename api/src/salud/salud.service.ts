import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import {
  ALERT_TYPE_ACTIVE_PORT,
  AlertTypeActivePort,
} from '../alert-catalog/ports';
import { CurrentUser } from '../auth/current-user';
import { VISITA_CERRADA, VisitaCerradaPayload } from '../kernel/events/visita-cerrada';
import { OutboxService } from '../kernel/outbox/outbox.service';
import { UnidadesService } from '../unidades/unidades.service';
import { SaludUnidadCatalog } from './andon-health.adapter';
import { UpdateHealthConfigDto } from './dto/salud.dto';
import {
  ANDON_HEALTH_INPUT_PORT,
  AndonHealthInputPort,
  HEALTH_ALERT_PORT,
  HealthAlertPort,
  ODOMETER_PORT,
  OdometerPort,
} from './ports';
import { SaludConfigInvalidError, SaludEngine } from './salud-engine';
import { TypeOrmSaludStore } from './typeorm-store';

@Injectable()
export class SaludService implements OnModuleInit {
  constructor(
    private readonly store: TypeOrmSaludStore,
    private readonly catalog: SaludUnidadCatalog,
    @Inject(ANDON_HEALTH_INPUT_PORT)
    private readonly andon: AndonHealthInputPort,
    @Inject(ODOMETER_PORT)
    private readonly odometer: OdometerPort,
    @Inject(HEALTH_ALERT_PORT)
    private readonly inbox: HealthAlertPort,
    private readonly unidades: UnidadesService,
    private readonly outbox: OutboxService,
    @Optional()
    @Inject(ALERT_TYPE_ACTIVE_PORT)
    private readonly alertTypes?: AlertTypeActivePort,
  ) {
    this.outbox.register(VISITA_CERRADA, async (payload) => {
      await this.engine().handleVisitaCerrada(
        (payload as unknown as VisitaCerradaPayload).unidadId,
      );
    });
  }

  async onModuleInit() {
    await this.engine().ensureActiveConfig('seed');
  }

  private engine() {
    return new SaludEngine({
      store: this.store,
      catalog: this.catalog,
      andon: this.andon,
      odometer: this.odometer,
      inbox: this.inbox,
      alertTypes: this.alertTypes,
    });
  }

  async getHealth(unidadId: string) {
    await this.unidades.findOne(unidadId);
    return this.engine().evaluateUnidad(unidadId);
  }

  async getConfig() {
    return this.engine().ensureActiveConfig();
  }

  async listVersions() {
    await this.engine().ensureActiveConfig();
    return this.engine().listVersions();
  }

  async updateConfig(dto: UpdateHealthConfigDto, user: CurrentUser) {
    try {
      return await this.engine().saveConfig(dto, user.userId);
    } catch (err) {
      if (err instanceof SaludConfigInvalidError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
