import {
  RabbitHeader,
  RabbitPayload,
  RabbitSubscribe,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  applyDecorators,
  createParamDecorator,
} from '@nestjs/common';
import { Channel } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { DelayCalculator } from './amqp-delay.calculator';
import { InspectedMessage } from './amqp-inspection.interceptor';
import { RetrialPolicy } from './amqp-retrial.interceptor';
import { Throttled } from './amqp-throttler.interceptor';
import {
  AmqpParams,
  QueuesFromDecoratorsContainer,
  formatDLQ,
} from './amqp.internals';

export type RetrialPolicy = {
  maxAttempts: number;
  timeBetweenAttemptsInSeconds: number;
  maxDelayInSeconds?: number;
  calculateDelay?: DelayCalculator;
};

type AmqpSubscribeOptions = {
  exchange: string;
  routingKey: string;
  queue: string;
  channel?: string;
  retrialPolicy?: RetrialPolicy;
  inspectMessage?: boolean;
  enableValidation?: boolean;
  throttleMessagePerSecondRate?: number;
};

const deadLetterNackErrorHandler = async (
  channel: Channel,
  message: ConsumeMessage,
  error: any,
  originalQueue: string,
) => {
  channel.publish(
    AmqpParams.DefaultExchange,
    formatDLQ(originalQueue),
    message.content,
    {
      ...message.properties,
      headers: {
        ...message.properties.headers,
        [AmqpParams.DeadLetterReason]: error,
      },
    },
  );
  channel.nack(message, false, false);
};

export const AmqpSubscribe = ({
  exchange,
  routingKey,
  queue,
  channel,
  enableValidation,
  retrialPolicy,
  inspectMessage,
  throttleMessagePerSecondRate,
}: AmqpSubscribeOptions) => {
  QueuesFromDecoratorsContainer.add(queue);
  const decorators = [
    RabbitSubscribe({
      exchange,
      routingKey,
      queue,
      createQueueIfNotExists: true,
      queueOptions: { channel },
      errorHandler: (channel, message, error) => {
        /**
         * Mixed Thoughts Here...
         * Maybe we should handle bad messages in the retrial interceptor
         * Only skipping the requeue engine when no retrial policy is provided
         */
        if (error instanceof BadRequestException) {
          return deadLetterNackErrorHandler(channel, message, error, queue);
        }
        return defaultNackErrorHandler(channel, message, error);
      },
    }),
  ];
  if (enableValidation !== false) {
    decorators.push(UsePipes(ValidationPipe));
  }
  const interceptors: NestInterceptor[] = [];

  if (inspectMessage) {
    interceptors.push(
      InspectedMessage(
        exchange,
        routingKey,
        queue,
        retrialPolicy?.maxDelayInSeconds,
        retrialPolicy?.maxAttempts,
        retrialPolicy?.timeBetweenAttemptsInSeconds,
      ),
    );

    if (retrialPolicy) {
      interceptors.push(
        RetrialPolicy({
          ...retrialPolicy,
          originalQueue: queue,
          originalRoutingKey: routingKey,
        }),
      );
    }

    if (throttleMessagePerSecondRate) {
      interceptors.push(Throttled(throttleMessagePerSecondRate));
    }
  }
  if (interceptors.length) {
    decorators.push(UseInterceptors(...interceptors));
  }
  return applyDecorators(...decorators);
};

export const AmqpMessage = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToRpc().getContext<ConsumeMessage>();
  },
);

export const AmqpPayload = RabbitPayload;
export const AmqpHeaders = RabbitHeader;
