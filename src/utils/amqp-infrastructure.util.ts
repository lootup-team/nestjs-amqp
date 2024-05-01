import { AmqpModuleOptions } from '../amqp.factory';
import { AmqpParams } from './amqp-params.util';

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

export const AMQP_INTERNAL_DEFAULT_CHANNEL: AmqpModuleOptions['channels'][number] =
  {
    name: 'AMQP_INTERNAL_DEFAULT_CHANNEL',
    default: true,
    prefetchCount: 1,
  };
