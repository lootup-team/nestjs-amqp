import { RabbitPayload } from '@golevelup/nestjs-rabbitmq';

/**
 * AMQP handler parameter decorator.
 * Extracts the entire parsed content from the `message` object and populates the decorated parameter with it.
 *
 * For example:
 * ```typescript
 * async consume(@AmqpPayload() data: MyMessageDTO)
 * ```
 *
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound payload parameter.
 *
 * @publicApi
 */
export const AmqpPayload = RabbitPayload;
