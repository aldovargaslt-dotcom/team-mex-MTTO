import { Injectable } from '@nestjs/common';
import { Severity } from './enums';
import {
  healthBelowCommand,
  healthBelowDedupeKey,
} from './inbox-rules';
import { NotificationsService } from './notifications.service';
import {
  HealthAlertOpened,
  HealthAlertPort,
  HealthAlertResolved,
} from '../salud/ports';

function toInboxSeverity(value: string): Severity {
  if (value === Severity.LOW) return Severity.LOW;
  if (value === Severity.INFO) return Severity.INFO;
  if (value === Severity.CRITICAL) return Severity.CRITICAL;
  return Severity.WARNING;
}

@Injectable()
export class SaludInboxAdapter implements HealthAlertPort {
  constructor(private readonly notifications: NotificationsService) {}

  async onOpened(event: HealthAlertOpened) {
    await this.notifications.ingest(
      healthBelowCommand({
        alertId: event.alert.id,
        unidadId: event.alert.unidadId,
        numeroInterno: event.numeroInterno,
        score: event.score,
        threshold: event.threshold,
        drivers: event.drivers,
        severity: toInboxSeverity(event.severity),
        openedAt: event.alert.openedAt,
      }),
    );
  }

  async onResolved(event: HealthAlertResolved) {
    await this.notifications.expireDedupe(healthBelowDedupeKey(event.unidadId));
  }
}
