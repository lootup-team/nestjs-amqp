import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AmqpModuleOptions } from './amqp.factory';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './amqp.module-builder';
import { AmqpInspectionService } from './services/amqp-inspection.service';
import { AmqpRetrialService } from './services/amqp-retrial.service';
import { AmqpThrottleService } from './services/amqp-throttle.service';
import { AmqpService } from './services/amqp.service';
import {
  DELAYED_RETRIAL_EXCHANGE,
  REROUTER_QUEUE,
} from './utils/amqp-infrastructure.util';
import { AmqpInspectionConfig } from './utils/amqp-inspection.config';
import { QueuesFromDecoratorsContainer } from './utils/amqp.internals';
import { appendAdditionalQueues } from './utils/append-additional-queues.utils';
import { getChannels } from './utils/get-channels.util';
import { getConnectionName } from './utils/get-connection-name.util';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      inject: [MODULE_OPTIONS_TOKEN, ConfigService],
      useFactory: (options: AmqpModuleOptions, config: ConfigService) => {
        const { queues = [], exchanges = [] } = options;
        appendAdditionalQueues(options, QueuesFromDecoratorsContainer);
        exchanges.push(DELAYED_RETRIAL_EXCHANGE);
        queues.push(REROUTER_QUEUE);
        // TODO: change for class setup simplifying this file
        return {
          uri: options.url,
          exchanges,
          queues,
          connectionInitOptions: { wait: false },
          channels: getChannels(options),
          connectionManagerOptions: {
            connectionOptions: {
              clientProperties: {
                connection_name: getConnectionName(options, config),
              },
            },
            reconnectTimeInSeconds: options.reconnectInSeconds ?? 10,
            heartbeatIntervalInSeconds:
              options.heartbeatIntervalInSeconds ?? 60,
          },
        };
      },
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
