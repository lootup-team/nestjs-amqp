import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Message } from 'amqplib';
import { Observable, catchError, tap } from 'rxjs';
import {
  AMQP_BINDING_KEY,
  AMQP_RETRIAL_POLICY_KEY,
  AMQP_THROTTLE_POLICY_KEY,
} from '../decorators/amqp-metadata.storage';
import { AmqpInspectionService } from '../services/amqp-inspection.service';
import { AmqpRetrialService } from '../services/amqp-retrial.service';
import { AmqpThrottleService } from '../services/amqp-throttle.service';
import { FailedPolicyException } from '../utils/amqp.internals';

@Injectable()
export class AmqpInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly throttler: AmqpThrottleService,
    private readonly inspector: AmqpInspectionService,
    private readonly retrial: AmqpRetrialService,
  ) {}

  private getMetadata(context: ExecutionContext) {
    const handler = context.getHandler();
    const subscriptionMetadata = this.reflector.get(AMQP_BINDING_KEY, handler);
    const retrialPolicy = this.reflector.get(AMQP_RETRIAL_POLICY_KEY, handler);
    const throttlePolicy = this.reflector.get(
      AMQP_THROTTLE_POLICY_KEY,
      handler,
    );

    return { subscriptionMetadata, retrialPolicy, throttlePolicy };
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    if (!isRabbitContext(context)) {
      return next.handle();
    }
    const rpcContext = context.switchToRpc();
    const message = rpcContext.getContext<Message>();
    const data = rpcContext.getData();

    const { retrialPolicy, subscriptionMetadata, throttlePolicy } =
      this.getMetadata(context);

    const messageWithMetadata = {
      consumeMessage: message,
      data,
      binding: subscriptionMetadata,
      retrialPolicy,
      throttlePolicy,
    };
    return next.handle().pipe(
      tap(
        async () =>
          await this.throttler.throttle(
            message.fields.consumerTag,
            throttlePolicy,
          ),
      ),
      tap(() =>
        this.inspector.inspectInbound({
          ...messageWithMetadata,
          status: 'Ack',
        }),
      ),
      catchError(async (error) => {
        try {
          const status = await this.retrial.apply({
            ...messageWithMetadata,
            error,
          });
          this.inspector.inspectInbound({
            ...messageWithMetadata,
            status,
            error,
          });
        } catch (err) {
          this.inspector.inspectInbound({
            ...messageWithMetadata,
            status: 'Nack::Requeue::FailedPolicy',
            error: err,
          });
          throw new FailedPolicyException(err);
        }
        throw error;
      }),
    );
  }
}
