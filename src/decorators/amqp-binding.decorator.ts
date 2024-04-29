import { SetMetadata } from '@nestjs/common';
import { AMQP_BINDING_KEY } from './amqp-metadata.storage';

export type BindingOptions = {
  exchange: string;
  routingKey: string;
  queue: string;
};

/**
 * AMQP handler decorator.
 * Sets the binding metadata, exchange, routingKey and queue to the especified handler.
 */
export const Binding = (opts: BindingOptions) =>
  SetMetadata<string, BindingOptions>(AMQP_BINDING_KEY, opts);
