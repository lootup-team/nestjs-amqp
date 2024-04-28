import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsumeMessage } from 'amqplib';
import { Observable, catchError } from 'rxjs';
import {
  DelayCalculator,
  doubleWithEveryAttemptDelayCalculator,
} from './amqp-delay.calculator';
import {
  AmqpParams,
  MaximumAttemptReachedException,
  formatDLQ,
} from './amqp.internals';
import { AmqpService } from './amqp.service';

const KEY = '@gedai/amqp/retrial-policy';

type RetrialPolicy = {
  originalQueue: string;
  originalRoutingKey: string;
  maxAttempts: number;
  delayBetweenAttemptsInSeconds: number;
  maxDelayInSeconds?: number;
  calculateDelay?: DelayCalculator;
};

export const Retrial = (opts: RetrialPolicy) =>
  SetMetadata<string, RetrialPolicy>(KEY, opts);

@Injectable()
export class RetrialInterceptor implements NestInterceptor {
  constructor(
    private readonly amqp: AmqpService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler<any>): Observable<any> {
    if (!isRabbitContext(ctx)) {
      return next.handle();
    }

    return next.handle().pipe(
      catchError(async (error) => {
        if (error instanceof BadRequestException) {
          throw error;
        }

        const {
          maxAttempts,
          originalQueue,
          originalRoutingKey,
          delayBetweenAttemptsInSeconds,
          calculateDelay = doubleWithEveryAttemptDelayCalculator,
          maxDelayInSeconds,
        } = this.reflector.get<RetrialPolicy>(KEY, ctx.getHandler());
        const context = ctx.switchToRpc().getContext<ConsumeMessage>();
        const channel = this.amqp.connection.managedChannel;
        const { content, properties } = context;
        const { headers } = properties;

        const currentAttempt =
          (headers[AmqpParams.AttemptCountHeader] ?? 0) + 1;

        if (currentAttempt < maxAttempts) {
          const delay =
            calculateDelay({
              currentAttempt,
              delayBetweenAttemptsInSeconds,
              maxDelayInSeconds,
            }) * 1000;
          headers[AmqpParams.AttemptCountHeader] = currentAttempt;
          headers[AmqpParams.RoutingKeyHeader] = originalRoutingKey;
          headers[AmqpParams.DelayHeader] = delay;
          await channel.publish(
            AmqpParams.DelayedExchange,
            originalQueue,
            content,
            properties,
          );
        } else {
          const dlq = formatDLQ(originalQueue);
          channel.publish('', dlq, content, properties);
          throw new MaximumAttemptReachedException(error);
        }
        throw error;
      }),
    );
  }
}
