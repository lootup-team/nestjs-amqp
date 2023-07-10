import { Injectable } from '@nestjs/common';
import { ChannelWrapper } from 'amqp-connection-manager';
import { AmqpConnection } from './amqp.connection';
import { MessageOptions } from './amqp.models';

@Injectable()
export class AmqpService {
  private channel: ChannelWrapper;

  constructor(private readonly connection: AmqpConnection) {}

  async onModuleInit() {
    this.connection.connect();
    this.channel = this.connection.createChannel(this.constructor.name);

    /** TODO: must assert queues and exchanges before trying to publish */
  }

  private assertResult(result: boolean) {
    if (!result) {
      throw new Error('MessageFailedError');
    }
  }

  async publish(
    exchange: string,
    routingKey: string,
    data: object,
    options?: MessageOptions,
  ) {
    await this.channel
      .publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), options)
      .then(this.assertResult);
  }

  async sendToQueue(queue: string, data: object, options?: MessageOptions) {
    await this.channel
      .sendToQueue(queue, Buffer.from(JSON.stringify(data)), options)
      .then(this.assertResult);
  }
}
