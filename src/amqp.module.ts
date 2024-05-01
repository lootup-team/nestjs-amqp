import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './amqp.module-builder';
import { AmqpInspectionService } from './services/amqp-inspection.service';
import { AmqpRetrialService } from './services/amqp-retrial.service';
import { AmqpThrottleService } from './services/amqp-throttle.service';
import { AmqpService } from './services/amqp.service';
import { AmqpInspectionConfig } from './utils/amqp-inspection.config';
import { InternalRabbitMQConfigFactory } from './utils/amqp.internals';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      inject: [MODULE_OPTIONS_TOKEN, ConfigService],
      useFactory: InternalRabbitMQConfigFactory,
    }),
  ],
  providers: [
    AmqpService,
    AmqpThrottleService,
    AmqpInspectionService,
    AmqpRetrialService,
    {
      provide: AmqpInspectionConfig,
      inject: [ConfigService],
      useFactory: (config) =>
        new AmqpInspectionConfig(
          config.get('TRAFFIC_INSPECTION_AMQP', 'inbound'),
        ),
    },
  ],
  exports: [
    MODULE_OPTIONS_TOKEN,
    AmqpService,
    AmqpThrottleService,
    AmqpInspectionService,
    AmqpRetrialService,
  ],
})
export class AmqpModule extends ConfigurableModuleClass {}
