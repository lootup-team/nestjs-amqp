import { ConfigService } from '@nestjs/config';
import { hostname } from 'os';
import { AmqpModuleOptions } from './amqp.factory';

/**
 * TODO: needs refactoring and placing thing in their proper files
 */

export const QueuesFromDecoratorsContainer = new Set<string>();

export class MaximumAttemptReachedException extends Error {
  readonly innerException: { stack: string; message: string };
  constructor(innerException: any) {
    super(`Maximum retrial attempts reached`);
    this.innerException = {
      message: innerException.message,
      stack: innerException.stack,
    };
  }
}

export enum AmqpParams {
  DefaultExchange = '',
  DelayedExchange = 'delayed.retrial.v1.exchange',
  RerouterQueue = 'delayed.retrial.v1.rerouter.queue',
  AttemptCountHeader = 'x-attempt-count',
  RoutingKeyHeader = 'x-original-routing-key',
  DelayHeader = 'x-delay',
  DeadLetterReason = 'x-dead-letter-reason',
}

export const DELAYED_RETRIAL_EXCHANGE = {
  name: AmqpParams.DelayedExchange,
  type: 'x-delayed-message',
  options: { arguments: { 'x-delayed-type': 'topic' } },
};

export const REROUTER_QUEUE = {
  name: AmqpParams.RerouterQueue,
  exchange: AmqpParams.DelayedExchange,
  routingKey: '#',
  options: {
    arguments: { 'x-message-ttl': 0 },
    deadLetterExchange: AmqpParams.DefaultExchange,
  },
};

export const getConnectionName = (
  options: AmqpModuleOptions,
  config: ConfigService,
) => {
  if (options.appName) {
    return options.appName;
  }
  const packageName = config.get('npm_package_name');
  const packageVersion = config.get('npm_package_version');
  const host = hostname();
  return `${host}::${packageName}@${packageVersion}`;
};

export const getChannels = (options: AmqpModuleOptions) => {
  return (options.channels ?? []).reduce(
    (acc, { name, ...channelConfig }) => ({
      ...acc,
      [name]: channelConfig,
    }),
    {},
  );
};

export const formatDLQ = (q: string) => `${q}.dead`;

export const appendAdditionalQueues = (
  options: AmqpModuleOptions,
  queuesInferedFromDecorators: Set<string>,
) => {
  const { queues = [] } = options;
  const alreadySetupQueues = {};

  queues.forEach(({ name }) => {
    queues.push({ name: formatDLQ(name) });
    alreadySetupQueues[name] = true;
  });
  queuesInferedFromDecorators.forEach((name) => {
    if (!alreadySetupQueues[name]) {
      queues.push({ name: formatDLQ(name) });
    }
  });
};
