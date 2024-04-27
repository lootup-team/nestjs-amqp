import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Message } from 'amqplib';
import { Observable, catchError, tap } from 'rxjs';
import { MaximumAttemptReachedException } from './amqp.internals';

export function InspectedMessage(
  exchangeName: string,
  routingKey: string,
  queueName: string,
  maxDelayInSeconds?: number,
  maxAttempts?: number,
  delayBetweenAttemptsInSeconds?: number,
): NestInterceptor {
  @Injectable()
  class InspectAmqpMessageInterceptor implements NestInterceptor {
    private logger = new Logger('InboundAmqpInspection');

    private getErrorStatus(error: any) {
      if (error instanceof BadRequestException) {
        return 'Nack::BadRequest::DeadLetter';
      }
      if (error instanceof MaximumAttemptReachedException) {
        return 'Nack::MaximumAttempts::DeadLetter';
      }
      return 'Nack::Error::Retry';
    }

    intercept(
      context: ExecutionContext,
      next: CallHandler<any>,
    ): Observable<any> {
      if (!isRabbitContext(context)) {
        return next.handle();
      }
      const rpcContext = context.switchToRpc();
      const rpcData = rpcContext.getData();
      const { content, fields, properties } = rpcContext.getContext<Message>();
      const message = `[${exchangeName}]::[${routingKey}]::[${queueName}]`;
      const logData = {
        exchange: exchangeName,
        routingKey,
        queue: queueName,
        maxAttempts,
        delayBetweenAttemptsInSeconds,
        maxDelayInSeconds,
        consumeMessage: {
          fields,
          properties,
          // TODO: when receiving a buffer, how to anonymize it?
          content: rpcData ?? content.toString('utf8'),
        },
      };
      return next.handle().pipe(
        tap((result) =>
          this.logger.log({
            message: `${message}::[Ack]`,
            data: logData,
            result,
          }),
        ),
        catchError((error) => {
          const status = this.getErrorStatus(error);
          this.logger.error({
            message: `${message}::[${status}]`,
            data: logData,
            error,
          });
          throw error;
        }),
      );
    }
  }
  return InspectAmqpMessageInterceptor as unknown as NestInterceptor;
}
