import { RabbitHeader } from '@golevelup/nestjs-rabbitmq';

/**
 * AMQP handler parameter decorator.
 * Extracts the `headers` property from the `message` object
 * and populates the decorated parameter with it.
 *
 * For example:
 * ```typescript
 * async consume(@AmqpHeaders() data: MyMessageDTO)
 * async consume(@AmqpHeaders('x-my-header') data: MyMessageDTO)
 * async consume(@AmqpHeaders('x-my-header', Pipe) data: MyMessageDTO)
 * async consume(@AmqpHeaders(Pipe) data: MyMessageDTO)
 * ```
 *
 * @param propertyKey name of single header property to extract.
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound payload parameter.
 *
 * @publicApi
 */
export const AmqpHeaders = RabbitHeader;
