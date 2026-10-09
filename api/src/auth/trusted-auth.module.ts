import {
  Global,
  Inject,
  Injectable,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { OidcAuthentication } from './oidc-authentication';
import { IdentityController } from './identity.controller';
import { ActorDirectoryPort } from './actor-directory.port';
import {
  AuthenticationPort,
  assertIdentityConfiguration,
  TrustedActor,
  validateActor,
} from './trusted-actor';

class UnconfiguredAuthentication extends AuthenticationPort {
  readonly kind = 'UNCONFIGURED' as const;
  async authenticate(): Promise<null> {
    return null;
  }
}
// Explicit development credentials map to server-configured actors. Browser
// X-Role/X-User-Id/display-name/facility headers are never identity sources.
class DevelopmentAuthentication extends AuthenticationPort {
  readonly kind = 'DEVELOPMENT_STUB' as const;
  constructor(private readonly actors: Record<string, TrustedActor>) {
    super();
  }
  async authenticate(request: Request): Promise<TrustedActor | null> {
    const header = request.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    const actor = Object.prototype.hasOwnProperty.call(this.actors, token)
      ? this.actors[token]
      : null;
    return actor
      ? {
          ...actor,
          authMode: 'DEVELOPMENT_STUB',
          attributionLevel: 'NON_PRODUCTION',
        }
      : null;
  }
}
@Injectable()
export class AuthenticationConfiguration implements OnModuleInit {
  constructor(
    @Inject(AuthenticationPort) private readonly port: AuthenticationPort,
    private readonly config: ConfigService,
  ) {}
  onModuleInit() {
    assertIdentityConfiguration(this.config.get('NODE_ENV'), this.port.kind);
  }
}
@Global()
@Module({
  controllers: [IdentityController],
  providers: [
    {
      provide: AuthenticationPort,
      inject: [ConfigService, { token: ActorDirectoryPort, optional: true }],
      useFactory: (
        config: ConfigService,
        directory?: ActorDirectoryPort,
      ): AuthenticationPort => {
        if (config.get('AUTH_MODE') === 'OIDC')
          return new OidcAuthentication(
            config,
            undefined,
            config.get('AUTH_ACTOR_STORE') === 'DATABASE'
              ? directory
              : undefined,
          );
        if (config.get('AUTH_MODE') !== 'DEVELOPMENT_STUB')
          return new UnconfiguredAuthentication();
        assertIdentityConfiguration(config.get('NODE_ENV'), 'DEVELOPMENT_STUB');
        const actors = JSON.parse(
          config.get<string>('AUTH_STUB_ACTORS', '{}'),
        ) as Record<string, TrustedActor>;
        for (const actor of Object.values(actors))
          validateActor(
            {
              ...actor,
              authMode: 'DEVELOPMENT_STUB',
              attributionLevel: 'NON_PRODUCTION',
            },
            config.get('NODE_ENV'),
          );
        return new DevelopmentAuthentication(actors);
      },
    },
    AuthenticationConfiguration,
  ],
  exports: [AuthenticationPort],
})
export class TrustedAuthModule {}
