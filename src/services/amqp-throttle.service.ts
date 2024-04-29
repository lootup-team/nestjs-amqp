import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { ThrottlePolicy } from '../decorators/amqp-throttle-policy.decorator';

@Injectable()
export class AmqpThrottleService {
  constructor(private readonly amqp: AmqpConnection) {}

  async throttle(consumerTag: string, policy?: ThrottlePolicy) {
    if (!policy) {
      return;
    }
    const { ratePerSecond } = policy;
    const waitTimeMS = (1 / ratePerSecond) * 1000;
    await this.amqp.cancelConsumer(consumerTag);
    setTimeout(async () => {
      await this.amqp.resumeConsumer(consumerTag);
    }, waitTimeMS);
  }
}
