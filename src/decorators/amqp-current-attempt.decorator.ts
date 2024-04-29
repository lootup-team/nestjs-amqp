import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { getCurrentAttempt } from '../utils/get-current-attempt.util';

/**
 * AMQP handler parameter decorator.
 * Extracts the `current attempt count` property from the `message` object
 * and populates the decorated parameter with it.
 *
 * For example:
 * ```typescript
 * async consume(@AmqpAttemptCount() data: number)
 * ```
 *
 * @publicApi
 */
export const AmqpCurrentAttempt = () =>
  createParamDecorator((data: unknown, ctx: ExecutionContext) =>
    getCurrentAttempt(ctx.switchToRpc().getContext<ConsumeMessage>()),
  )();
