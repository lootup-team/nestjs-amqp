import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Message } from 'amqplib';
import { Observable, catchError, tap } from 'rxjs';
import { MaximumAttemptReachedException } from './amqp.internals';

const KEY = '@gedai/amqp/inspected-message';

type InspectionMetadata = {
  binding: {
    exchangeName: string;
    routingKey: string;
    queueName: string;
  };
  retrialPolicy?: {
    maxDelayInSeconds?: number;
    maxAttempts?: number;
    delayBetweenAttemptsInSeconds?: number;
  };
};

export const InspectedMessage = (opts: InspectionMetadata) =>
  SetMetadata<string, InspectionMetadata>(KEY, opts);

@Injectable()
export class InspectAmqpMessageInterceptor implements NestInterceptor {
  private logger = new Logger('InboundAmqpInspection');

  constructor(private readonly reflector: Reflector) {}

  private getErrorStatus(
    error: any,
    retrialPolicy?: InspectionMetadata['retrialPolicy'],
  ) {
    /**
     * TODO: inspection; retrial; @golevelup/rabbitmq are sharing the responsability of
     * deciding what happens to the message. This is bad, as a change in such a rule gets
     * propagated to other places.
     */
    if (error instanceof BadRequestException) {
      return 'Nack::BadRequest::DeadLetter';
    }
    if (error instanceof MaximumAttemptReachedException) {
      return 'Nack::MaximumAttempts::DeadLetter';
    }
    if (retrialPolicy) {
      return 'Nack::Error::Retry';
    }
    return 'Nack::Error::DeadLetter';
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    if (!isRabbitContext(context)) {
      return next.handle();
    }

    const { binding, retrialPolicy = {} } =
      this.reflector.get<InspectionMetadata>(KEY, context.getHandler());
    const { exchangeName, queueName, routingKey } = binding;
    const { delayBetweenAttemptsInSeconds, maxAttempts, maxDelayInSeconds } =
      retrialPolicy;

    const rpcContext = context.switchToRpc();
    const rpcData = rpcContext.getData();
    const { content, fields, properties } = rpcContext.getContext<Message>();
    const message = `[${exchangeName}]::[${routingKey}]::[${queueName}]`;
    const logData = {
      binding: {
        exchange: exchangeName,
        routingKey,
        queue: queueName,
      },
      retrialPolicy: {
        maxAttempts,
        delayBetweenAttemptsInSeconds,
        maxDelayInSeconds,
      },
      consumeMessage: {
        fields,
        properties,
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
