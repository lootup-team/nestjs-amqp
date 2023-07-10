import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Ctx, MessagePattern } from '@nestjs/microservices';
import { ConsumeMessage } from 'amqplib';
import { ControlHeaders } from './amqp.models';

/**
 * RPC handler parameter decorator. Injects the `raw message`
 * into the decorated parameter.
 *
 * For example:
 * ```typescript
 * async handle(@RawMessage() message: Message)
 * ```
 */
export const RawMessage = Ctx;

/**
 * RPC handler parameter decorator. Extracts the `header`
 * property from the `message` object and populates the decorated
 * parameter with the value of `header`.
 *
 * For example:
 * ```typescript
 * async handle(@Headers('foo') foo: string)
 * ```
 *
 * @param {string} property name of single property to extract from the `header` object
 */
export const Headers = (property?: string) =>
  createParamDecorator((_data: unknown, context: ExecutionContext) => {
    const message = context.switchToRpc().getContext<ConsumeMessage>();
    const { headers } = message.properties;

    if (property) {
      return headers[property];
    }

    return headers;
  })();

/**
 * RPC handler parameter decorator. Extracts the `attemptCount`
 * property from the `message` object and populates the decorated
 * parameter with the value.
 *
 * For example:
 * ```typescript
 * async handle(@AttemptCount() attemptCount: number)
 * ```
 */
export const AttemptCount = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const message = context.switchToRpc().getContext<ConsumeMessage>();
    const { headers } = message.properties;
    return headers[ControlHeaders.AttemptCount] || 1;
  },
);

/**
 * Subscribes to incoming messages which fulfils chosen pattern
 *
 * For example:
 * ```typescript
 * @SubscribeMessage('foo.bar')
 * async handle(@Headers('foo') foo: string) {}
 * ```
 *
 * @param routingKey the pattern you want to subscribe with (routingKey)
 * @param consumerId consumer to subscribe this handler with (if you have multiple)
 */
export const Subscribe = (routingKey: string, consumerId?: symbol) =>
  MessagePattern(routingKey, consumerId);
