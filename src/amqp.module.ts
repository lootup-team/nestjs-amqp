import { DynamicModule, Module } from '@nestjs/common';
import { AmqpConnection } from './amqp.connection';
import { AmqpModuleAsyncOptions, AmqpModuleOptions } from './amqp.models';
import { AmqpService } from './amqp.service';

@Module({})
export class AmqpModule {
  static forRoot(options: AmqpModuleOptions): DynamicModule {
    const { url, isGlobal = false } = options;
    return {
      module: AmqpModule,
      global: isGlobal,
      providers: [
        { provide: 'AmqpExchangeOptions', useValue: { url } },
        AmqpConnection,
        AmqpService,
      ],
      exports: [AmqpConnection],
    };
  }

  static forRootAsync(options: AmqpModuleAsyncOptions): DynamicModule {
    const { imports, useFactory, inject, isGlobal = false } = options;

    return {
      module: AmqpModule,
      imports,
      global: isGlobal,
      providers: [
        { provide: 'AmqpExchangeOptions', inject, useFactory },
        AmqpConnection,
        AmqpService,
      ],
      exports: [AmqpConnection],
    };
  }
}
