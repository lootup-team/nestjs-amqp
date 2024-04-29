import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';

/**
 * AMQP handler parameter decorator.
 * Extracts the entire raw `message` object and populates the decorated parameter with it.
 *
 * For example:
 * ```typescript
 * async consume(@AmqpMessage() data: MyMessageDTO)
 * ```
 *
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound message parameter.
 *
 * @publicApi
 */
export const AmqpMessage = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToRpc().getContext<ConsumeMessage>();
  },
);
