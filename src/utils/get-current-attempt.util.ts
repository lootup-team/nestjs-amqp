import { Message } from 'amqplib';
import { AmqpParams } from './amqp-params.util';

export const getCurrentAttempt = (message: Message) => {
  const { headers } = message.properties;
  const attemptCount = (headers?.[AmqpParams.AttemptCountHeader] ?? 0) + 1;
  return attemptCount;
};
