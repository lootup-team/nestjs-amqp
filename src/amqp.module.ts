import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AmqpModuleOptions } from './amqp.factory';
import {
  DELAYED_RETRIAL_EXCHANGE,
  QueuesFromDecoratorsContainer,
  REROUTER_QUEUE,
  appendAdditionalQueues,
  getChannels,
  getConnectionName,
} from './amqp.internals';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './amqp.module-builder';
import { AmqpService } from './amqp.service';

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
  providers: [AmqpService],
  exports: [MODULE_OPTIONS_TOKEN, AmqpService],
})
export class AmqpModule extends ConfigurableModuleClass {}
