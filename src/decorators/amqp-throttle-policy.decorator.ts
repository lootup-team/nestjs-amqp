import { SetMetadata } from '@nestjs/common';
import { AMQP_THROTTLE_POLICY_KEY } from './amqp-metadata.storage';

export type ThrottlePolicy = {
  ratePerSecond: number;
};

/**
 * Sets a throttling policy for consuming messages in the specified handler.
 * In order to work correctly the channel must be configured with a prefetch of 1.
 *
 * @param {number} messagePerSecond - The number of messages that should be consumed per second.
 */
export const AmqpThrottlePolicy = (messagePerSecond: number) =>
  SetMetadata<string, ThrottlePolicy>(AMQP_THROTTLE_POLICY_KEY, {
    ratePerSecond: messagePerSecond,
  });
