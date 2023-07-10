# @gedai/nestjs-amqp

# Description

The AMQP Exchanges module for NestJS is a powerful tool that enhances your application's messaging capabilities using the AMQP (Advanced Message Queuing Protocol) protocol. It is built on top of the [amqp-connection-manager](https://github.com/benbria/node-amqp-connection-manager) library, which ensures high resiliency and robustness in handling server connections.

This module provides a range of features to streamline your messaging workflows. One of its key functionalities is the ability to automatically retry failed messages. Whenever a message fails to be processed, the module will handle the retry logic, ensuring that the message is reprocessed without manual intervention.

Additionally, the module enables you to introduce delays between retrials of failed messages. This feature is particularly useful when dealing with transient errors or situations where a delay is required before retrying message processing.

Another essential feature offered by the AMQP Exchanges module is dead lettering. Messages that have repeatedly failed to be processed can be automatically sent to a dead letter exchange, allowing you to isolate and analyze problematic messages separately.

With this module, you can also establish multiple bindings per consumer. This means that a single consumer can receive messages from multiple exchanges, simplifying the process of managing and organizing message routing within your application. It also supports consuming the same message from multiple handlers withing the application enhancing flexibilty of your messaging system.

Overall, the AMQP Exchanges module for NestJS empowers your application with advanced messaging capabilities, you can efficiently handle and process messages within your NestJS application.

# Before we start

When working with RabbitMQ, you have the ability to route your messages using wildcards: the multiword wildcard (#) and the singleword wildcard (\*). These wildcards allow you to define flexible patterns for routing keys and match them to the appropriate message handlers. Let's take a look at some examples to help you understand the routing capabilities:

| Message Routing Key | Registered Handler | Description                                                                                                                                                                                                                |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foo.bar.bin.baz`   | `foo.bar.bin.baz`  | This is a direct binding where the routing key matches the registered handler exactly.                                                                                                                                     |
| `foo.bar.bin.baz`   | `*.bar.bin.baz`    | This example uses a single word wildcard. The routing key can have any single word before .bar.bin.baz, allowing it to be routed to a handler registered with any word in that position                                    |
| `foo.bar.bin.baz`   | `foo.*.*.baz`      | Another single word wildcard example. The routing key can have any word in the second and third position before .baz, making it compatible with a registered handler that has any combination of words in those positions. |
| `foo.bar.bin.baz`   | `foo.#.baz`        | This is an example of a multiword wildcard. The routing key can have any number of words before .baz, making it suitable for a handler registered with any combination of words or no words at all.                        |
| `foo.bar.bin.baz`   | `#.bin.baz`        | Here's another multiword wildcard example. The routing key can have any number of words before .bin.baz, allowing it to be handled by a registered handler with any combination of words preceding .bin.baz.               |
| `foo.bar.bin.baz`   | `#.baz`            | This multiword wildcard allows the routing key to have any number of words before .baz, making it compatible with a handler registered with any combination of words or no words at all.                                   |
| `foo.bar.bin.baz`   | `#`                | Finally, we have the most generic wildcard, which matches any routing key. This means it can be used to handle messages with any routing key, regardless of the structure or words it contains.                            |

By using these wildcards, you can define various routing patterns in RabbitMQ, allowing for flexible message routing and efficient handling based on your specific requirements.

# Getting Started

## Install the required packages

To begin, install the necessary packages by running the following command in your terminal:

```bash
npm install @gedai/nestjs-amqp amqplib amqp-connection-manager @nestjs/microservices
```

## Common setup

Next, set up a controller to subscribe to messages. Here's an example of how you can define a subscription controller:

```typescript
// Import the necessary decorators and classes
import { Controller } from '@nestjs/common';
import { Subscribe, Payload, Headers, AttemptCount } from '@gedai/nestjs-amqp';

@Controller()
export class MySubscriptionController {
  // Define a handler method for the subscribed message
  @Subscribe('foo.bar.bin')
  async myHandler(
    @Payload() payload: any, // Parsed message data
    @Headers() headers: any, // Message headers
    @AttemptCount() count: number, // Current attempt count (starts at 1)
  ) {
    // Implement your logic here
  }
}
```

After defining the controller, bind it to your application's modules:

```typescript
@Module({
  imports: [],
  providers: [],
  controllers: [MySubscriptionController],
})
export class AppModule {}
```

## Hybrid application setup

If you're setting up a hybrid application (combining HTTP and AMQP), follow these steps:

```typescript
@Module({
  imports: [
    AmqpModule.forRoot({
      url: 'amqp://rabbit:rabbit@localhost:5672',
      // Asynchronous configuration options can be provided using `forRootAsync` and `useFactory`
      isGlobal: true,
    }),
  ],
  providers: [],
  controllers: [MySubscriptionController],
})
export class AppModule {}
```

In your main file, create the NestJS application and connect the microservice:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Retrieve the AMQP connection instance to reuse it
  const connection = app.get(AmqpConnection);

  // Connect the microservice using the `AmqpExchangeTransport` strategy
  app.connectMicroservice<MicroserviceOptions>({
    strategy: new AmqpExchangeTransport({
      connection,
      exchange: { name: 'gedai' },
      retry: {
        maxInterval: 10000,
        interval: 2500,
        limit: 5,
      },
    }),
  });

  await app.listen(3000);
  await app.startAllMicroservices();
}
```

## Microservice application setup

For a microservice application that exclusively uses AMQP, follow these steps:

In your main file, create the microservice and configure the AmqpExchangeTransport strategy:

```typescript
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      strategy: new AmqpExchangeTransport({
        url: 'amqp://rabbit:rabbit@localhost:5672',
        exchange: { name: 'gedai' },
        retry: {
          maxInterval: 10000,
          interval: 2500,
          limit: 5,
        },
      }),
    },
  );

  await app.listen();
}
```

These setup instructions will help you get started with the AMQP Exchanges module for NestJS. By following these steps, you can effectively subscribe to messages and integrate AMQP messaging into your NestJS application or microservice.

# Decorators

This package includes several decorators that simplify the process of working with messaging in your controllers. These decorators are built on top of Nest's default decorators, providing additional functionality. Here's an overview of the most commonly used decorators:

## @Subscribe

The `@Subscribe` decorator is used to bind a handler method to messages with a specific routing key. It acts as an alias to Nest's default `@MessagePattern` decorator but focuses on providing a clear understanding of how to specify routing keys and bind to specific consumers. Usage examples include:

- `@Subscribe('foo.bar')`: Binds the handler to messages with the foo.bar routing key.
- `@Subscribe('foo.bar', Symbol.for('Consumer1'))`: Binds the handler to messages with the foo.bar routing key on a specific consumer.

## @Headers

The `@Headers` decorator allows you to access message headers within your handler methods. It can be used in two ways:

- `@Headers()`: Injects the entire message headers object into the parameter.
- `@Headers('only-one')`: Retrieves a specific message header (in this example, the only-one header) and injects it into the parameter.

## AttemptCount

The `@AttemptCount` decorator provides access to the current attempt count of a message within your handler methods. The attempt count indicates the number of times the message has been retried, starting from 1.

## RawMessage

The `@RawMessage` decorator provides access to the current raw message within your handler methods. This can be used to extract any other information from the message like it's fields or properties.

By utilizing these decorators, you can easily bind handlers to specific routing keys, access message headers, and retrieve the attempt count of messages. This enhances the readability and simplicity of your messaging code within your NestJS controllers.

# Configurations

## Retrial Configurations

In our consumers, you may have noticed that we utilize customized retry configurations. These configurations are optional and allow you to fine-tune the consumption and retrial of events according to your specific needs. Here are some important points to understand about the retry configurations:

- Maximum Retrial: When specifying the maximum retrial value, it's essential to note that your handler will execute at most one more time than the specified value. For example, if you set the maximum retrial to 5, your handler will execute a total of 6 times. This is because we consider the initial attempt as the expected first attempt, not a retrial. If the message fails, we will attempt to retry it for a maximum of the configured retrial number. This is configured through the `retrial.limit` property.

- Interval Between Retrials: The interval between retrials determines the waiting period in milliseconds before each retry attempt. With each subsequent retry, this interval doubles until it reaches the maximum interval specified in the configuration. If you do not provide a maximum interval, the doubling will continue indefinitely. It is configured through the `retrial.interval` property.

- Maximum Interval Between Retrials: This is a limit that will prevent doublings beyond this limit and is configured thorugh the `retrial.maxInterval` property.

To configure these values you can use the following approach:

```typescript
app.connectMicroservice<MicroserviceOptions>({
  strategy: new AmqpExchangeTransport({
    connection,
    exchange: {
      name: 'zen',
    },
    // Specify the retry policy
    retry: {
      maxInterval: 25000,
      interval: 2500,
      limit: 5,
    },
  }),
});
```

## Consuming from Other Exchanges

To consume messages from another exchange, you can bind the exchange using the following approach:

```typescript
app.connectMicroservice<MicroserviceOptions>({
  strategy: new AmqpExchangeTransport({
    connection,
    exchange: {
      name: 'zen',
      // Specify the exchange to bind to and its routing key
      bindToExchanges: [
        {
          name: 'zen.dlx',
          routingKey: '#.dead',
        },
      ],
    },
  }),
});
```

By employing this configuration, your service will receive any messages published to the specified exchange, adhering to the routing key within your service's exchange. This approach allows you to bind to any existing exchange. In the provided example, we have bound to the dead letter exchange (`zen.dlx`), but you can apply the same technique to bind with any other exchange you require.

## Consuming the Same Message in Multiple Handlers

When consuming messages in controllers using the AMQP Exchanges module, it is possible to route a single message to multiple handlers based on their routing keys. This allows you to handle the same message in different ways depending on the specific routing key patterns defined in your handlers.

For example, let's consider two handlers in a controller:

```typescript
@Controller()
export class MySubscriptionController {
  @Subscribe('foo.bar')
  async handlerOne() {
    // Handle the message for 'foo.bar'
  }

  @Subscribe('foo.*')
  async handlerTwo() {
    // Handle the message for any routing key starting with 'foo.'
  }
}
```

In this scenario, if a message with the routing key 'foo.bar' is received, it will trigger both `handlerOne` and `handlerTwo`. Both handlers will run independently for retrial and dead lettering purposes. This means that if the message fails and needs to be retried, each handler will follow its own retry logic and potential dead lettering, separate from the other handler. Another scenario would be that `handlerOne` fails and needs to retry the message, but `handlerTwo` succeeds and doesn't need to retry.

So, while both handlers are triggered by the same message, they operate in isolation for retrial and dead lettering processes. This flexibility allows you to have multiple handlers processing the same message based on different routing key patterns, enabling you to handle the message in distinct ways according to your application's needs.

## Consuming the same message with the exact same routing keys

Additionally, if you have the requirement to have two handlers with the exact same routing key, you can achieve this by setting up multiple consumers using the multiple consumers setup approach and binding their exchanges.

Let's say you have two handlers that need to handle messages with the routing key 'foo.bar'. Instead of defining both handlers in the same consumer, you can create separate consumers, bind them together and assign them the same routing key. Here's an example:

```typescript
// consumer config for Consumer A
app.connectMicroservice<MicroserviceOptions>({
  strategy: new AmqpExchangeTransport({
    consumerId: Consumers.ConsumerA,
    connection,
    exchange: {
      name: 'zen',
    },
  }),
});

// consumer config for Consumer B
app.connectMicroservice<MicroserviceOptions>({
  strategy: new AmqpExchangeTransport({
    consumerId: Consumers.ConsumerB,
    connection,
    exchange: {
      // clone the exchange
      name: 'zenClone',
      bindToExchanges: [
        {
          name: 'zen',
          routingKey: 'foo.bar',
        },
      ],
    },
  }),
});

// controller config for Consumer A
class ControllerA {
  @Subscribe('foo.bar', Consumers.ConsumerA)
  async handlerA() {
    // Handle the message for 'foo.bar' in Consumer A
  }
}

// controller config for Consumer B
class ControllerB {
  @Subscribe('foo.bar', Consumers.ConsumerB)
  async handlerB() {
    // Handle the message for 'foo.bar' in Consumer B
  }
}
```

With this setup, you can have two separate consumers, Consumer A and Consumer B, both handling messages with the exact same routing key 'foo.bar'. Each consumer will independently process the messages assigned to them, enabling you to have different logic or behavior in each handler.

By utilizing multiple consumers with the same routing key, you can achieve the desired separation and individual processing of messages with identical routing keys, ensuring that each handler operates independently within its designated consumer.

## Using Multiple Consumers in the Same App

If you need to connect multiple consumers within the same application, you can do so by following these steps:

Create an object that will manage your subscription IDs throughout your app. This object will control and provide the subscription IDs to each consumer. Here's an example:

```typescript
// Define the consumer IDs in an object
export const Consumers = {
  ZenConsumer: Symbol.for('Zen'),
  GedaiConsumer: Symbol.for('Gedai'),
};
```

In your main file, when instantiating the transport for each consumer, assign the appropriate consumer ID from the object created in the previous step. Here's an example:

```typescript
// Connect the first consumer
app.connectMicroservice<MicroserviceOptions>({
  strategy: new AmqpExchangeTransport({
    consumerId: Consumers.ZenConsumer,
    connection,
    exchange: {
      name: 'zen',
    },
  }),
});

// Connect the second consumer
app.connectMicroservice<MicroserviceOptions>({
  strategy: new AmqpExchangeTransport({
    consumerId: Consumers.GedaiConsumer,
    connection,
    exchange: {
      name: 'gedai',
    },
  }),
});
```

In your controllers, specify to which consumer you want to bind the events using the appropriate consumer ID. Here's an example:

```typescript
@Controller()
export class MySubscriptionController {
  // Bind the event to the ZenConsumer
  @Subscribe('foo.bar.bin', Consumers.ZenConsumer)
  async myHandler() {
    // Handle the event
  }

  // Bind the event to the GedaiConsumer
  @Subscribe('bazinga.foo.bar', Consumers.GedaiConsumer)
  async myOtherHandler() {
    // Handle the event
  }
}
```

By following this setup, you can configure multiple consumers within a hybrid application and bind events independently. You can even have similar routing keys, but each event will only be triggered for the specific consumer it is assigned to, based on its controlling exchange.

# Behind the Scenes (In depth of RabbitMQ Server)

Behind the scenes, the AMQP Exchanges module creates two exchanges to facilitate the functioning of your consumers. Let's take a closer look at these exchanges and the related artifacts created within RabbitMQ:

1. Consumer's Exchange: The first exchange created is the consumer's exchange, which has the same name as the one provided in the `exchange` parameter. For example, if you specify the exchange name as 'zen', the consumer's exchange will also be named 'zen'. This exchange is responsible for handling the messages received by the consumers.

1. Queues: Two queues are created for each consumer's exchange: the `main` queue and the `retry` queue. These queues are named by appending the respective suffixes to the consumer's exchange name. For example, if the consumer's exchange is 'zen', the corresponding queues will be 'zen.main' and 'zen.retry'.

1. Bindings: The following bindings are established between the exchanges, routing keys, and queues:
   - Binding 1: `exchange(zen)` => `routingKey(zen.main)` => `queue(zen.main)`
     This binding is used for rerouting retrials. Messages that fail to be processed by the consumer are sent to the retry queue, and after a specified expiration period, they are requeued into the consumer's exchange, which then resends them to the main queue for retrial.
   - Binding 2: `exchange(zen)` => `routingKey(zen.retry)` => `queue(zen.retry)`
     This binding is used for waiting between retrials. Messages in the retry queue are held here temporarily before being requeued for the next retry attempt.
   - Binding 3: `exchange(zen)` => `routingKey(foo.*)` => `queue(zen.main)`
     This binding is used to actually bind the messages to the consumer. Messages with routing keys that match the pattern specified in your controllers are directed to the main queue of the consumer's exchange.

In addition to these artifacts, a dead letter exchange is created with a dlx suffix to the original exchange's name. For example, if the consumer's exchange is 'zen', the dead letter exchange will be 'zen.dlx'. The dead letter exchange is not bound to any queues by default unless you explicitly define the bindings.

With the following setup:

```typescript
// consumer config
app.connectMicroservice<MicroserviceOptions>({
  strategy: new AmqpExchangeTransport({
    consumerId: Consumers.GedaiConsumer, // and here
    connection,
    exchange: {
      name: 'zen',
    },
  }),
});

// controller config
class Controller {
  @Subscribe('foo.bar')
  async myHandler() {
    // do magic 😎
  }
}
```

The resulting RabbitMQ artifacts would be as follows:

- Exchanges:
  - zen
  - zen.dlx (Dead Letter Exchange)
- Queues:
  - zen.main
  - zen.retry
- Bindings:
  - Rerouting Retrial: `exchange(zen)` => `routingKey(zen.main)` => `queue(zen.main)`
  - Waiting between retrials: `exchange(zen)` => `routingKey(zen.retry)` => `queue(zen.retry)`
  - Consuming messages: `exchange(zen)` => `routingKey(foo.*)` => `queue(zen.main)`

These RabbitMQ artifacts enable the functioning of the AMQP Exchanges module and ensure the proper handling and routing of messages within your application.
