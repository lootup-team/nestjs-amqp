import { ContextService } from '@gedai/nestjs-core';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { MessageProperties } from 'amqplib';
import { randomUUID } from 'crypto';
import { AmqpInspectionService } from './amqp-inspection.service';

@Injectable()
export class AmqpService {
  constructor(
    private readonly amqp: AmqpConnection,
    private readonly inspector: AmqpInspectionService,
    private readonly contextService: ContextService,
  ) {}

  async publish(
    exchange: string,
    routingKey: string,
    content: object,
    properties?: MessageProperties,
  ) {
    const messageProperties = this.getMessageProperties(properties);
    await this.publishWithInspection(
      exchange,
      routingKey,
      content,
      messageProperties,
    );
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
    const messageProperties = this.getMessageProperties(properties);
    await this.publishWithInspection(
      '',
      queue,
      targetContent,
      messageProperties,
    );
  }

  private factoryHeaders(headers?: MessageProperties['headers']) {
    const correlationId = this.contextService.getCorrelationId();
    return {
      ...(headers ?? {}),
      'x-correlation-id': headers?.['x-correlation-id'] ?? correlationId,
    };
  }

  private factoryMessageId(id: any) {
    return id ?? randomUUID();
  }

  private getMessageProperties(properties?: MessageProperties) {
    return {
      ...properties,
      headers: this.factoryHeaders(properties?.headers),
      messageId: this.factoryMessageId(properties?.messageId),
    };
  }

  private async publishWithInspection(
    exchange: string,
    routingKey: string,
    content: object,
    properties?: MessageProperties,
  ) {
    const err = await this.amqp
      .publish(exchange, routingKey, content, properties)
      .then(() => null)
      .catch((error) => error);

    this.inspector.inspectOutbound(
      exchange,
      routingKey,
      content,
      properties,
      err,
    );

    if (err) {
      throw err;
    }
  }
}
