import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsumeMessage } from 'amqplib';
import { Observable } from 'rxjs';
import { AmqpService } from './amqp.service';

const KEY = '@gedai/amqp/throttle';

type RatePerSecond = {
  ratePerSecond: number;
};

export const Throttle = (ratePerSecond: number) =>
  SetMetadata<string, RatePerSecond>(KEY, { ratePerSecond });

@Injectable()
export class ThrottledInterceptor implements NestInterceptor {
  constructor(
    private readonly amqp: AmqpService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    if (!isRabbitContext(ctx)) {
      return next.handle();
    }

    const { ratePerSecond } = this.reflector.get<RatePerSecond>(
      KEY,
      ctx.getHandler(),
    );

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
