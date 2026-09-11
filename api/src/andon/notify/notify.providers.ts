import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NOTIFY_PORT } from '../ports';
import { StubWhatsAppAdapter } from '../stub-whatsapp.adapter';
import { createAndonNotify, envFromConfig } from './notify.factory';

/** Selección de proveedor NotifyPort (noop | evolution) para NOTIFY_PORT. */
export const andonNotifyProviders: Provider[] = [
  {
    provide: NOTIFY_PORT,
    inject: [ConfigService, StubWhatsAppAdapter],
    useFactory: (config: ConfigService, stub: StubWhatsAppAdapter) =>
      createAndonNotify(envFromConfig(config), stub),
  },
];
