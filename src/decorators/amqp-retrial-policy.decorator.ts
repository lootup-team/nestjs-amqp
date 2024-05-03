import { SetMetadata } from '@nestjs/common';
import { DelayCalculator } from '../utils/amqp-delay.calculator';
import { AMQP_RETRIAL_POLICY_KEY } from './amqp-metadata.storage';

export type RetrialPolicy = {
  maxAttempts: number;
  delay: number;
  maxDelay: number;
  calculateDelay?: DelayCalculator;
};

/**
 * AMQP handler decorator. Sets the retrial policy for messages
 * handled by the specified handler.
 *
 * @param {RetrialPolicy} opts - configuration object specifying:
 *
 * - `maxAttempts` - The maximum number of attempts before considering the message a dead letter.
 * - `delay` - The number of seconds to delay before retrying the message.
 * - `maxDelay` - The maximum number of seconds to delay before retrying the message, in case a incremental factor is provided.
 * - `calculateDelay` - The calculator that determines the amount of time to wait before retrying the message.
 *
 * @publicApi
 */
export const AmqpRetrialPolicy = (opts: RetrialPolicy) =>
  SetMetadata<string, RetrialPolicy>(AMQP_RETRIAL_POLICY_KEY, opts);
