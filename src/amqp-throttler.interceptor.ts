import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { Observable } from 'rxjs';
import { AmqpService } from './amqp.service';

export function Throttled(ratePerSecond: number): NestInterceptor {
  @Injectable()
  class ThrottlerInterceptor implements NestInterceptor {
    constructor(private readonly amqp: AmqpService) {}

    async intercept(
      ctx: ExecutionContext,
      next: CallHandler<any>,
    ): Promise<Observable<any>> {
      if (!isRabbitContext(ctx)) {
        return next.handle();
      }

      const context = ctx.switchToRpc().getContext<ConsumeMessage>();
      const throttle = async () => {
        const { consumerTag } = context.fields;
        const waitTimeMS = (1 / ratePerSecond) * 1000;
        await this.amqp.connection.cancelConsumer(consumerTag);
        setTimeout(async () => {
          await this.amqp.connection.resumeConsumer(consumerTag);
        }, waitTimeMS);
      };

      await throttle();
      return next.handle();
    }
  }

  return ThrottlerInterceptor as unknown as NestInterceptor;
}
