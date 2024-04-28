## Description

Opionated AMQP integration package to simplify microservices implementation in NestJS. This package is a wrapper around @golevelup/rabbitmq and offers simple integration with other @gedai packages as well as Inspecting, Throttling and Retrying messages.

## Importante Notes

- This project does not implement Request/Response.
- Although this project is stable, it is a POC and requires a lot of refactoring for improving its maintainability.

## Getting Started

### Step 1: Installation

```bash
$ npm install @gedai/nestjs-core @gedai/nestjs-common @gedai/amqp @nestjs/config
```

### Step 2: The Setup

Apply global wide gedai configurations in main.ts, these are optional. Configuring Context Wrappers is highly recommended though.

```typescript
// main.ts
import {
  configureCORS,
  configureCompression,
  configureExceptionLogger,
  configureHelmet,
  configureHttpInspectorInbound,
  configureHttpInspectorOutbound,
  configureLogger,
  configureRoutePrefix,
  configureValidation,
  configureVersioning,
} from '@gedai/nestjs-common';
import { configureContextWrappers } from '@gedai/nestjs-core';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
    .then(configureContextWrappers())
    .then(configureLogger())
    .then(configureHttpInspectorInbound())
    .then(configureHttpInspectorOutbound())
    .then(configureExceptionLogger())
    .then(configureCORS())
    .then(configureHelmet())
    .then(configureCompression())
    .then(configureValidation())
    .then(configureVersioning())
    .then(configureRoutePrefix());

  const config = app.get(ConfigService);
  const port = config.get('PORT', '3000');

  await app.listen(port);
}
bootstrap();
```

Create a class for your subscription handlers. These are common NestJS @Injectable Providers. You can also use class-validator if the configuration has been enabled with configureValidation in main.ts

```typescript
// amqp.subscription.ts
import { ContextService } from '@gedai/nestjs-core';
import { Injectable } from '@nestjs/common';

@Injectable()
import { AmqpHeaders, AmqpPayload, AmqpSubscribe } from '@gedai/amqp';
import { Injectable, Logger } from '@nestjs/common';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { AppService } from './app.service';

class MyMessage {
  @IsString()
  message: string;

  @IsNumber()
  @IsOptional()
  failTimes: number;
}

@Injectable()
export class AmqpSubscription {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly appService: AppService) {}

  // <<-- Decorate the AMQP Subscription -->>
  @AmqpSubscribe({
    exchange: 'my.exchange',
    queue: 'my.consumer1',
    routingKey: '#',
    // The channel must be declared in app.module during the module setup
    channel: 'myChannel1',
    // optional: add message throttling
    throttleMessagePerSecondRate: 1,
    // optional: add message retrial policy
    retrialPolicy: {
      maxAttempts: 2,
      delayBetweenAttemptsInSeconds: 5,
      maxDelayInSeconds: 5,
    },
  })
  async getHello(@AmqpPayload() data: MyMessage, @AmqpHeaders() msg: any) {
    this.logger.log('Got a message', 'Consumer 1');
  }
}

```

Import the required modules and create the specific setup for your needs.

```typescript
// app.module.ts
import { AmqpModule } from '@gedai/amqp';
import { ContextModule } from '@gedai/nestjs-core';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AmqpSubscription } from './amqp.subscription';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // <<-- IMPORT CONFIG -->>
    ConfigModule.forRoot({ isGlobal: true }),
    // <<-- IMPORT CONTEXT -->>
    ContextModule.forRoot({}),
    // <<-- IMPORT AMQP -->>
    AmqpModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // <<-- PROVIDE YOUR AMQP URL -->>
        url: config.getOrThrow('AMQP_URL'),
        // <<-- DECLARE YOUR EXCHANGES -->>
        exchanges: [{ name: 'my.exchange' }],
        // <<-- DECLARE YOUR CHANNELS -->>
        channels: [
          { name: 'myPublisher1', default: true },
          { name: 'myChannel1', prefetchCount: 1 },
        ],
        // <<-- DECLARE YOUR QUEUES -->>
        queues: [
          { name: 'my.consumer1' },
          // :: Keep Layout ::
        ],
      }),
    }),
  ],
  controllers: [AppController],
  // <<-- We add -->>
  providers: [AppService, AmqpSubscriber],
})
export class AppModule {}
```

## Architecture

This module uses RabbitMQ X-Delayed-Message plugin for handling delayed delayed retrials. By detecting an error the message will be published to `delayed.retrial.v1.exchange` with the original queue as the routing key. After the specified delay, it will be sent to `delayed.retrial.v1.rerouter.queue`. This queue has the default exchange setup as it's dead letter exchange and is also configured to expire messages as soon as they have been received by the queue. Therefore, when a messages gets to the queue it is expired and sent do the dead letter exchange with the original queue as the routing key. The default exchange will then, reroute the message into the original queue for consumption. If the maximum attempts is reached and the message keeps failing it will the sent to the DLQ. If the retrial policy is not provided or the message fails validation, they get sent to the DLQ directly.

### Retrial:

```
Original Exchange
-> Original Worker Queue
  ->  Delayed Exchange
    -> Rerouter Queue - Expire Instantly
      -> Default Exchange
        -> Original Worker Queue0
```

### Dead Lettering On Max Attempts:

```
Original Exchange
-> Original Worker Queue
  -> Max Attempts
    -> Default Exchange
      -> DQL
```

### Dead Lettering On Bad Messages:

```
Original Exchange
-> Original Worker Queue
  -> BadRequest (Class Validator Validation)
    -> Default Exchange
      -> DQL
```

## License

Gedai is [MIT licensed](LICENSE).
