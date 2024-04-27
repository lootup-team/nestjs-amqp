import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
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

export type InternalRetrialOptions = {
  originalQueue: string;
  originalRoutingKey: string;
  maxAttempts: number;
  timeBetweenAttemptsInSeconds: number;
  maxDelayInSeconds?: number;
  calculateDelay?: DelayCalculator;
};

export function RetrialPolicy(opts: InternalRetrialOptions): NestInterceptor {
  const {
    originalQueue,
    maxAttempts,
    timeBetweenAttemptsInSeconds,
    maxDelayInSeconds,
    calculateDelay = doubleWithEveryAttemptDelayCalculator,
  } = opts;
  @Injectable()
  class RetrialInterceptor implements NestInterceptor {
    constructor(private readonly amqp: AmqpService) {}

    intercept(ctx: ExecutionContext, next: CallHandler<any>): Observable<any> {
      if (!isRabbitContext(ctx)) {
        return next.handle();
      }

      return next.handle().pipe(
        catchError(async (error) => {
          if (error instanceof BadRequestException) {
            throw error;
          }
          const context = ctx.switchToRpc().getContext<ConsumeMessage>();
          const channel = this.amqp.connection.managedChannel;
          const { content, properties, fields } = context;
          const { headers } = properties;

          const currentAttempt =
            (headers[AmqpParams.AttemptCountHeader] ?? 0) + 1;

          if (currentAttempt < maxAttempts) {
            const delay =
              calculateDelay({
                currentAttempt,
                timeBetweenAttemptsInSeconds,
                maxDelayInSeconds,
              }) * 1000;
            headers[AmqpParams.AttemptCountHeader] = currentAttempt;
            headers[AmqpParams.RoutingKeyHeader] =
              headers[AmqpParams.RoutingKeyHeader] ?? fields.routingKey;
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

  return RetrialInterceptor as unknown as NestInterceptor;
}
