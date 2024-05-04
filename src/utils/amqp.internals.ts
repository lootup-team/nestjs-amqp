import { AmqpModuleOptions } from '../amqp.factory';
import {
  AMQP_INTERNAL_DEFAULT_CHANNEL,
  DELAYED_RETRIAL_EXCHANGE,
  REROUTER_QUEUE,
} from './amqp-infrastructure.util';
import { formatChannels } from './format-channels.util';
import { mergeChannels } from './merge-channels.util';
import { mergeQueues } from './merge-queues.util';

export const QueuesFromDecoratorsContainer = new Set<string>();
export const ChannelsFromDecoratorsContainer: AmqpModuleOptions['channels'] =
  [];

/**
 * This internal exception signals that we were unable to
 * communicate with RabbitMQ Server for requeueing or nacking.
 * This is a catastrophical event.
 */
export class FailedPolicyException extends Error {
  readonly innerException: { stack: string; message: string };
  constructor(innerException: any) {
    super(`Failed Policy Exception`);
    this.innerException = {
      message: innerException.message,
      stack: innerException.stack,
    };
  }
}

export const InternalRabbitMQConfigFactory = (options: AmqpModuleOptions) => {
  const { exchanges = [] } = options;
  const queues = mergeQueues(options, QueuesFromDecoratorsContainer);
  exchanges.push(DELAYED_RETRIAL_EXCHANGE);
  queues.push(REROUTER_QUEUE);
  const channels = mergeChannels(options, ChannelsFromDecoratorsContainer);
  if (!channels.find((x) => x.default)) {
    channels.push(AMQP_INTERNAL_DEFAULT_CHANNEL);
  }
  // TODO: change for class setup simplifying this file
  return {
    uri: options.url,
    exchanges,
    queues,
    connectionInitOptions: { wait: false },
    channels: formatChannels(channels),
    connectionManagerOptions: {
      connectionOptions: {
        clientProperties: {
          connection_name: options.appName,
        },
      },
      reconnectTimeInSeconds: options.reconnectInSeconds ?? 10,
      heartbeatIntervalInSeconds: options.heartbeatIntervalInSeconds ?? 60,
    },
  };
};
