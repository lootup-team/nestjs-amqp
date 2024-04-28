import { ContextService } from '@gedai/core';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { MessageProperties } from 'amqplib';
import { randomUUID } from 'crypto';

/**
 * TODO: Should we expose connection?
 */
@Injectable()
export class AmqpService {
  constructor(
    private readonly amqp: AmqpConnection,
    private readonly contextService: ContextService,
  ) {}

  async publish(
    exchange: string,
    routingKey: string,
    content: object,
    properties?: MessageProperties,
  ) {
    await this.amqp.publish(exchange, routingKey, content, {
      ...properties,
      headers: this.factoryHeaders(properties?.headers),
      messageId: this.factoryMessageId(properties?.messageId),
    });
  }

  async sendToQueue(
    queue: string,
    content: object,
    properties?: MessageProperties,
  ) {
    const targetContent =
      content instanceof Buffer
        ? content
        : Buffer.from(JSON.stringify(content));
    await this.amqp.managedChannel.sendToQueue(queue, targetContent, {
      ...properties,
      headers: this.factoryHeaders(properties.headers),
      messageId: this.factoryMessageId(properties.messageId),
    });
  }

  get connection(): AmqpConnection {
    return this.amqp;
  }

  private factoryHeaders(headers?: MessageProperties['headers']) {
    const contextId = this.contextService.getId();
    return {
      ...(headers ?? {}),
      'x-context-id': headers?.['x-context-id'] ?? contextId,
    };
  }

  private factoryMessageId(id: any) {
    return id ?? randomUUID();
  }
}
