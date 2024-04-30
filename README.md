## Description

This package is essentially a wrapper around `@golevelup/nestjs-rabbitmq`. It is highly focused on subscribing to messages from an exchange and offering some additional features:

- Retrial Policy
- Throttling Policy
- Message Inspection
- Message Validation

## Requirements

- RabbitMQ Server with X-Delayed-Message Plugin installed.

## Getting Started

### Step 1: Installation

```bash
$ npm install @gedai/nestjs-core @gedai/nestjs-common @gedai/nestjs-amqp @nestjs/config
```

### Step 2: The Setup

Create a common NestJS @Injectable() provider class for your subscription handlers.

```typescript
// app.subscription.ts
import { ContextService } from '@gedai/nestjs-core';
import { Injectable } from '@nestjs/common';

@Injectable()
import { AmqpHeaders, AmqpPayload, AmqpSubscribe } from '@gedai/nestjs-amqp';
import { Injectable, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Injectable()
export class AppSubscription {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly appService: AppService) {}

  // <<-- Decorate the AMQP Subscription -->>
  @AmqpSubscribe({
    exchange: 'my.exchange',
    queue: 'my.consumer1',
    routingKey: '#',
    channel: 'myChannel1',
  })
  async getHello(@AmqpPayload() data: any, @AmqpHeaders() headers: any) {
    this.logger.log('Got a message', 'Consumer 1');
  }
}

```

Import the required modules and create the required setup.

```typescript
// app.module.ts
import { AmqpModule } from '@gedai/nestjs-amqp';
import { ContextModule } from '@gedai/nestjs-core';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AmqpSubscription } from './amqp.subscription';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // <<-- IMPORT CONTEXT -->>
    ContextModule.forRoot({}),
    // <<-- IMPORT AMQP -->>
    AmqpModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // <<-- PROVIDE AMQP URL -->>
        url: config.getOrThrow('AMQP_URL'),
        // <<-- DECLARE EXCHANGES -->>
        exchanges: [{ name: 'my.exchange' }],
        // <<-- DECLARE CHANNELS -->>
        channels: [
          { name: 'myPublisher1', default: true },
          { name: 'myChannel1', prefetchCount: 1 },
        ],
        // <<-- DECLARE QUEUES -->>
        queues: [
          { name: 'my.consumer1' },
          // :: Keep Layout ::
        ],
      }),
    }),
  ],
  controllers: [AppController],
  // <<-- Add AppSubscription in the Providers Array -->>
  providers: [AppService, AppSubscription],
})
export class AppModule {}
```

## Retrial Policy Setup

To add a retrial policy, simply apply the decorator to your handler.

```typescript
// app.subscription.ts
import { ContextService } from '@gedai/nestjs-core';
import { Injectable } from '@nestjs/common';

@Injectable()
import {
  AmqpHeaders,
  AmqpPayload,
  AmqpRetrialPolicy,
  AmqpSubscription
} from '@gedai/nestjs-amqp';
import { Injectable, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Injectable()
export class AppSubscription {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly appService: AppService) {}

  @AmqpSubscription({
    exchange: 'my.exchange',
    queue: 'my.consumer1',
    routingKey: '#',
    channel: 'myChannel1',
  })
  // <<-- Add Your Policy -->>
  @AmqpRetrialPolicy({ maxAttempts: 2, delayTime: 5, maxDelay: 5 })
  async getHello(@AmqpPayload() data: any, @AmqpHeaders() headers: any) {
    this.logger.log('Got a message', 'Consumer 1');
  }
}
```

## Throttle Policy Setup

To add a throttle policy, simply apply the decorator to your handler.

```typescript
// app.subscription.ts
import { ContextService } from '@gedai/nestjs-core';
import { Injectable } from '@nestjs/common';

@Injectable()
import {
  AmqpHeaders,
  AmqpPayload,
  AmqpThrottlePolicy,
  AmqpSubscription
} from '@gedai/nestjs-amqp';
import { Injectable, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Injectable()
export class AppSubscription {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly appService: AppService) {}

  @AmqpSubscription({
    exchange: 'my.exchange',
    queue: 'my.consumer1',
    routingKey: '#',
    channel: 'myChannel1',
  })
  // <<-- Add Your Policy -->>
  @AmqpThrottlePolicy(5)
  async getHello(@AmqpPayload() data: any, @AmqpHeaders() headers: any) {
    this.logger.log('Got a message', 'Consumer 1');
  }
}
```

## Validation

Create and configure your DTOs with class validator and set them in the handler.

```typescript
// app.subscription.ts
import { ContextService } from '@gedai/nestjs-core';
import { Injectable } from '@nestjs/common';
import { IsString } from 'class-validator';

@Injectable()
import {
  AmqpHeaders,
  AmqpPayload,
  AmqpThrottlePolicy,
  AmqpSubscription
} from '@gedai/nestjs-amqp';
import { Injectable, Logger } from '@nestjs/common';
import { AppService } from './app.service';

class DogDTO {
  @IsString()
  name: string,

  @IsString()
  breed: string
}

@Injectable()
export class AppSubscription {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly appService: AppService) {}

  @AmqpSubscription({
    exchange: 'my.exchange',
    queue: 'my.consumer1',
    routingKey: '#',
    channel: 'myChannel1',
  })
  async getHello(@AmqpPayload() data: DogDTO, @AmqpHeaders() headers: any) {
    this.logger.log('Got a message', 'Consumer 1');
  }
}
```

## Architecture

This module utilizes the `RabbitMQ Plugin X-Delayed-Message` to facilitate delayed retrials.

Upon error detection, the message is dispatched to `delayed.retrial.v1.exchange`, with the original queue serving as the routing key. Subsequently, after the specified delay period, it is forwarded to `delayed.retrial.v1.rerouter.queue`. This queue is configured with the `amqp default exchange` as its dead letter exchange and is set to expire messages immediately upon receipt.

Consequently, upon reaching the queue, messages are expired and directed to the dead letter exchange, utilizing the original queue as the routing key. The `default exchange` then reroutes the message back into the original queue for consumption.

In the event `maximum attempts` is reached and the message continues to fail, it is then redirected to the Dead Letter Queue (DLQ). If no retrial policy is provided or if the message fails validation, it is directly routed to the DLQ.

## License

Gedai is [MIT licensed](LICENSE).
