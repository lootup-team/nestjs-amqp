import { Logger } from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import {
  Subject,
  Subscription,
  filter,
  isObservable,
  lastValueFrom,
  map,
} from 'rxjs';
import { AmqpConnection } from './amqp.connection';
import {
  AmqpExchangeController,
  AmqpExchangeTransportOptions,
  ControlHeaders,
} from './amqp.models';

export class AmqpExchangeTransport
  extends Server
  implements CustomTransportStrategy
{
  readonly transportId: symbol;

  protected readonly logger = new Logger(this.constructor.name);

  private readonly exchange: AmqpExchangeController;
  private readonly subject = new Subject<ConsumeMessage>();
  private connection: AmqpConnection;
  private channel: ChannelWrapper;
  private routingKeys: { routingKey: string; regex: RegExp }[];
  private subscriptions: Subscription[];

  constructor(private readonly options: AmqpExchangeTransportOptions) {
    super();

    const { connection, url } = options;
    if (!connection && !url) {
      throw new Error('AmqpError: neither connection nor url provided');
    }

    this.transportId = options.consumerId || Symbol.for(options.exchange.name);

    this.exchange = new AmqpExchangeController(
      this.options.exchange.name,
      this.options.exchange.type,
    );

    if (!this.options.retry) {
      this.options.retry = {};
    }
  }

  async listen(callback: () => void) {
    this.connect();

    this.channel.consume(this.exchange.queues.main, this.onMessage.bind(this), {
      noAck: true,
    });
    callback();
  }

  async close() {
    await this.connection.close();
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    // TODO: should we close subject somehow?
  }

  //#region internals
  private async assertExchange(channel: Channel) {
    await channel.assertExchange(this.exchange.name, this.exchange.type);
    await channel.assertExchange(this.exchange.dlx, this.exchange.type);
  }

  private async assertQueues(channel: Channel) {
    const { name: exchange, queues: q } = this.exchange;

    await channel.assertQueue(q.main, {
      deadLetterExchange: exchange,
      deadLetterRoutingKey: q.retry,
    });

    await channel.assertQueue(q.retry, {
      deadLetterExchange: exchange,
      deadLetterRoutingKey: q.main,
    });
  }

  private getRoutingKeyRegex(routingKey: string) {
    const bindingKey = routingKey
      .replaceAll('.', '\\.')
      .replaceAll('*', '[a-zA-Z0-9-]+')
      .replaceAll('#', '.+');

    return new RegExp(`^${bindingKey}$`);
  }

  private async bindQueues(channel: Channel) {
    const { name: exchange, queues: q } = this.exchange;

    await channel.bindQueue(q.main, exchange, q.main);
    await channel.bindQueue(q.retry, exchange, q.retry);
  }

  private async bindRoutingKeys(channel: Channel) {
    const routingKeys = Array.from(this.messageHandlers.keys());

    this.routingKeys = routingKeys.map((x) => ({
      routingKey: x,
      regex: this.getRoutingKeyRegex(x),
    }));

    await Promise.all(
      routingKeys.map((routingKey) =>
        channel.bindQueue(
          this.exchange.queues.main,
          this.exchange.name,
          routingKey,
        ),
      ),
    );
  }

  private async bindExchanges(channel: Channel) {
    const exchangeBindings = this.options.exchange.bindToExchanges;
    if (!exchangeBindings) {
      return;
    }

    await Promise.all(
      exchangeBindings.map((x) =>
        channel.bindExchange(this.exchange.name, x.name, x.routingKey),
      ),
    );
  }

  private async bindSubscriptionHandlers() {
    const obs$ = this.subject.asObservable();

    this.subscriptions = this.routingKeys.map(
      ({ routingKey: handlerRoutingKey, regex }) =>
        obs$
          .pipe(
            map((message: ConsumeMessage) => {
              const isDeadHandler = this.isDeadHandler(message);
              const failedRoutingKey = this.getFailedRoutingKey(message);
              const routingKey = this.getRoutingKey(message, isDeadHandler);
              return { message, routingKey, isDeadHandler, failedRoutingKey };
            }),

            filter(
              ({ routingKey, failedRoutingKey, isDeadHandler }) =>
                regex.test(routingKey) &&
                (isDeadHandler ||
                  !failedRoutingKey ||
                  failedRoutingKey === handlerRoutingKey),
            ),
          )
          .subscribe(async (/*NOSONAR*/ { message, routingKey }) => {
            const handler = this.getHandlerByPattern(handlerRoutingKey);
            if (!handler) {
              this.logger.warn(
                `No handler found for message with pattern ${routingKey}`,
              );
              return;
            }

            try {
              const result = await handler(this.tryParse(message), message);
              if (isObservable(result)) {
                await lastValueFrom(result);
              }
            } catch (err) {
              await this.onMessageError(message, handlerRoutingKey);
            }
          }),
    );
  }

  private async setup(channel: Channel) {
    await this.assertExchange(channel);
    await this.assertQueues(channel);
    await this.bindQueues(channel);
    await this.bindExchanges(channel);
    await this.bindRoutingKeys(channel);
    await this.bindSubscriptionHandlers();
  }

  private connect() {
    const { url, connection } = this.options;
    if (!connection) {
      this.connection = new AmqpConnection({ url });
    } else {
      this.connection = connection;
    }

    this.connection.connect();

    this.channel = this.connection.createChannel(
      this.constructor.name,
      this.setup.bind(this),
    );
  }

  private tryParse(message: ConsumeMessage) {
    try {
      return JSON.parse(message.content.toString('utf8'));
    } catch {
      return message.content.toString('utf8');
    }
  }

  private getExpiration(totalAttempts: number) {
    const { interval = 10000, maxInterval } = this.options.retry;

    const retryDelayFactor = 2;
    const expiration =
      interval + interval * ((totalAttempts - 1) * retryDelayFactor);

    return maxInterval && expiration > maxInterval ? maxInterval : expiration;
  }

  private isDeadHandler(message: ConsumeMessage) {
    return message.fields.routingKey.endsWith('.dead');
  }

  private getFailedRoutingKey(message: ConsumeMessage) {
    return message.properties.headers[ControlHeaders.FailedHandlerRoutingKey];
  }

  private getRoutingKey(
    message: ConsumeMessage,
    isDeadHandler: boolean,
  ): string {
    if (isDeadHandler) {
      return message.fields.routingKey;
    }

    return (
      message.properties.headers[ControlHeaders.OriginalRoutingKey] ||
      message.fields.routingKey
    );
  }

  private async onMessage(message: ConsumeMessage) {
    this.subject.next(message);
  }

  private async onMessageError(
    message: ConsumeMessage,
    failedRoutingKey: string,
  ) {
    const { limit = 10 } = this.options.retry;
    const totalAttempts =
      message.properties.headers[ControlHeaders.AttemptCount] || 1;

    const routingKey = this.getRoutingKey(message, false);

    if (totalAttempts <= limit) {
      const expiration = this.getExpiration(totalAttempts);
      await this.channel.sendToQueue(
        this.exchange.queues.retry,
        message.content,
        {
          expiration,
          headers: {
            ...message.properties.headers,
            [ControlHeaders.OriginalRoutingKey]: routingKey,
            [ControlHeaders.FailedHandlerRoutingKey]: failedRoutingKey,
            [ControlHeaders.AttemptCount]: totalAttempts + 1,
          },
        },
      );
      return;
    }

    if (!this.isDeadHandler(message)) {
      await this.channel.publish(
        this.exchange.dlx,
        `${routingKey}.dead`,
        message.content,
        {
          headers: {
            ...message.properties.headers,
            [ControlHeaders.DeadReason]: `Maximum attempts of ${limit} reached`,
            [ControlHeaders.OriginalRoutingKey]: routingKey,
            [ControlHeaders.FailedHandlerRoutingKey]: routingKey,
            [ControlHeaders.AttemptCount]: totalAttempts,
          },
        },
      );
    }
  }
  //#endregion internals
}
