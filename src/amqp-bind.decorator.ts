import { ReloadContext } from '@gedai/core';
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
  Type,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  applyDecorators,
  createParamDecorator,
} from '@nestjs/common';
import { Channel } from 'amqp-connection-manager';
import { ConsumeMessage, Message } from 'amqplib';
import { DelayCalculator } from './amqp-delay.calculator';
import {
  InspectAmqpMessageInterceptor,
  InspectedMessage,
} from './amqp-inspection.interceptor';
import { Retrial, RetrialInterceptor } from './amqp-retrial.interceptor';
import { Throttle, ThrottledInterceptor } from './amqp-throttler.interceptor';
import {
  AmqpParams,
  QueuesFromDecoratorsContainer,
  formatDLQ,
} from './amqp.internals';

export type RetrialPolicy = {
  maxAttempts: number;
  delayBetweenAttemptsInSeconds: number;
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
  // TODO: should validate these before setting up and throw on missing values (like empty queue name)
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
         * TODO: Currently this shares synchronization code with retrial and inspector
         * We need a mechanism to have a single place for such rule
         */
        if (error instanceof BadRequestException || !retrialPolicy) {
          return deadLetterNackErrorHandler(channel, message, error, queue);
        }
        return defaultNackErrorHandler(channel, message, error);
      },
    }),
    ReloadContext({
      interceptorSetup: (context, executionContext) => {
        const message = executionContext.switchToRpc().getContext<Message>();
        // TODO: expose this parameter in core
        const id = message.properties?.headers?.['x-context-id'];
        context.setId(id);
      },
    }),
  ];
  if (enableValidation !== false) {
    decorators.push(UsePipes(ValidationPipe));
  }
  const interceptors: Type<NestInterceptor>[] = [];
  if (inspectMessage !== false) {
    const retrialPolicyMeta = retrialPolicy
      ? {
          delayBetweenAttemptsInSeconds:
            retrialPolicy?.delayBetweenAttemptsInSeconds,
          maxAttempts: retrialPolicy?.maxAttempts,
          maxDelayInSeconds: retrialPolicy?.maxDelayInSeconds,
        }
      : {};
    decorators.push(
      InspectedMessage({
        binding: {
          exchangeName: exchange,
          routingKey,
          queueName: queue,
        },
        retrialPolicy: retrialPolicyMeta,
      }),
    );
    interceptors.push(InspectAmqpMessageInterceptor);

    if (retrialPolicy) {
      decorators.push(
        Retrial({
          ...retrialPolicy,
          originalQueue: queue,
          originalRoutingKey: routingKey,
        }),
      );
      interceptors.push(RetrialInterceptor);
    }

    if (throttleMessagePerSecondRate) {
      decorators.push(Throttle(throttleMessagePerSecondRate));
      interceptors.push(ThrottledInterceptor);
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
