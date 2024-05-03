# @gedai/nestjs-amqp

## Description

This package serves as a comprehensive enhancement to the `@golevelup/nestjs-rabbitmq`, offering a seamless integration with NestJS applications. It extends functionalities to enable easy subscription to messages from an exchange while introducing several additional features to streamline message handling.

## Prerequisites

This package requires the installation of the following dependencies:

- `@gedai/nestjs-core`
- `@gedai/nestjs-common`

This package seamlessly integrates with RabbitMQ's `X-Delayed Message` Plugin to handle the delayed retrial of messages, optimizing message delivery and processing. A `RabbitMQ Server` with the plugin installed is needed in order for this pacakge to work.

# Getting Started

### Step 1: Installation

Install the necessary packages with your favorite Package Manager.

```bash
$ npm install @gedai/nestjs-core @gedai/nestjs-amqp @nestjs/config
```

### Step 2: Configuration Setup

Create a common NestJS `@Injectable()` provider class for your subscription handlers.

```typescript
// app.subscription.ts
import { AmqpHeaders, AmqpPayload, AmqpSubscription } from '@gedai/nestjs-amqp';
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
    prefetch: 5,
  })
  async getHello(@AmqpPayload() data: any, @AmqpHeaders() headers: any) {
    this.logger.log('Got a message', 'Consumer 1');
  }
}
```

In your `app.module.ts`, import the required modules and set up the necessary dependencies.

```typescript
// app.module.ts
import { AmqpModule } from '@gedai/nestjs-amqp';
import { ContextModule } from '@gedai/nestjs-core';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppSubscription } from './app.subscription';

@Module({
  imports: [
    ContextModule.forRoot({}),
    AmqpModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.getOrThrow('AMQP_URL'),
        exchanges: [
          { name: 'my.exchange' },
          // ::keep layout::
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppSubscription],
})
export class AppModule {}
```

# Features

## Retrial Policy

Enables the definition and implementation of retrial policies for consumers, ensuring robustness in message delivery. To integrate a retrial policy into your subscription handler, use the `@AmqpRetrialPolicy` decorator as follows:

```typescript
// app.subscription.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  AmqpHeaders,
  AmqpPayload,
  AmqpRetrialPolicy,
  AmqpSubscription,
} from '@gedai/nestjs-amqp';
import { AppService } from './app.service';

@Injectable()
export class AppSubscription {
  private readonly logger = new Logger(this.constructor.name);

  @AmqpSubscription({
    exchange: 'my.exchange',
    queue: 'my.consumer1',
    routingKey: '#',
    channel: 'myChannel1',
    prefetch: 10,
  })
  // Apply Retrial Policy, delay timing in seconds
  @AmqpRetrialPolicy({ maxAttempts: 3, delay: 5, maxDelay: 60 })
  async getHello(@AmqpPayload() data: any, @AmqpHeaders() headers: any) {
    this.logger.log('Received a message', 'Consumer 1');
  }
}
```

## Throttling Policy

Facilitates the implementation of throttling policies to regulate message consumption and processing, enhancing system stability under heavy loads. To integrate a throttling policy into your subscription handler, first set the `prefetch: 1` on the handler and use the `@AmqpThrottlePolicy` decorator as follows:

```typescript
// app.subscription.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  AmqpHeaders,
  AmqpPayload,
  AmqpSubscription,
  AmqpThrottlePolicy,
} from '@gedai/nestjs-amqp';
import { AppService } from './app.service';

@Injectable()
export class AppSubscription {
  private readonly logger = new Logger(this.constructor.name);

  @AmqpSubscription({
    exchange: 'my.exchange',
    queue: 'my.consumer1',
    routingKey: '#',
    channel: 'myChannel1',
    prefetch: 1,
  })
  // Apply Retrial Policy
  @AmqpThrottlePolicy(5) //messages per second rate
  async getHello(@AmqpPayload() data: any, @AmqpHeaders() headers: any) {
    this.logger.log('Received a message', 'Consumer 1');
  }
}
```

## Message Inspection

Provides tools for comprehensive message inspection, empowering developers to gain insights into message content and structure for effective debugging and monitoring.

It can be configured with the environment variable `TRAFFIC_INSPECTION_AMQP` which determine the inspection mode and supports the values `all`, `none`, `inbound`, or `outbound`.

## Message Validation

Supports message validation mechanisms, ensuring that incoming messages adhere to predefined schemas or criteria, thereby maintaining data integrity and system reliability. To set up validation for your DTOs, integrate them into your subscription handlers as follows:

```typescript
// app.subscription.ts
import { Injectable, Logger } from '@nestjs/common';
import { IsString } from 'class-validator';
import {
  AmqpHeaders,
  AmqpPayload,
  AmqpThrottlePolicy,
  AmqpSubscription,
} from '@gedai/nestjs-amqp';
import { AppService } from './app.service';

// Define DTOs with validation decorators
class DogDTO {
  @IsString()
  name: string;

  @IsString()
  breed: string;
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
  async getHello(
    @AmqpPayload()
    data: DogDTO /* Map DTOs in Handlers decorated with @AmqpPayload() */,
    @AmqpHeaders() headers: any,
  ) {
    // Your message handling logic here
    this.logger.log('Received a message', 'Consumer 1');
  }
}
```

## Retrial Architecture

This module utilizes the `RabbitMQ Plugin X-Delayed-Message` to facilitate delayed retrials.

Upon error detection, the message is dispatched to `delayed.retrial.v1.exchange`, with the original queue serving as the routing key. Subsequently, after the specified delay period, it is forwarded to `delayed.retrial.v1.rerouter.queue`. This queue is configured with the `AMQP Default Exchange` as its dead letter exchange and is set to expire messages immediately upon receipt.

Consequently, upon reaching the queue, messages are expired and directed to the dead letter exchange, utilizing the original queue as the routing key. The `Default Exchange` then reroutes the message back into the original queue for consumption.

In the event `maximum attempts` is reached and the message continues to fail, it is then redirected to the Dead Letter Queue (DLQ). If no retrial policy is provided or if the message fails validation, it is directly routed to the DLQ.

## License

Gedai is [MIT licensed](LICENSE).
