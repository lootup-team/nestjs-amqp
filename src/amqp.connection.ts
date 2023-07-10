import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import { Channel } from 'amqplib';
import { AmqpConnectionOptions } from './amqp.models';

@Injectable()
export class AmqpConnection {
  private readonly logger = new Logger(this.constructor.name);
  private conn: AmqpConnectionManager;
  private channels: Record<string, ChannelWrapper> = {};

  constructor(
    @Inject('AmqpExchangeOptions')
    private readonly options: AmqpConnectionOptions,
  ) {}

  connect() {
    if (!this.conn) {
      this.conn = connect(this.options.url);
      this.logger.log('Connection created');
    }
  }

  createChannel(name: string, setup?: (channel: Channel) => Promise<void>) {
    const channel = this.conn.createChannel({ name, setup });
    this.channels[name] = channel;

    this.logger.log(`Channel ${name} created`);
    return channel;
  }

  async closeChannel(name: string) {
    const channel = this.channels[name];
    if (!channel) {
      throw new Error(`Channel ${name} does not exist`);
    }

    await channel.close();
    this.channels[name] = null;
    this.logger.log(`Channel ${name} closed`);
  }

  getChannel(name: string) {
    const channel = this.channels[name];
    if (!channel) {
      throw new Error(`Channel ${name} does not exist`);
    }

    return channel;
  }

  async close() {
    if (!this.conn) {
      this.logger.log('Connection is already closed');
      return;
    }

    await Promise.all(Object.values(this.channels).map((x) => x.close()));
    this.logger.log('Closed all channels');

    await this.conn.close();
    this.conn = null;
    this.logger.log('Closed connection');
  }
}
