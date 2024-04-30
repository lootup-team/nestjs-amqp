import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Message, MessageProperties } from 'amqplib';
import { BindingOptions } from '../decorators/amqp-binding.decorator';
import { RetrialPolicy } from '../decorators/amqp-retrial-policy.decorator';
import { ThrottlePolicy } from '../decorators/amqp-throttle-policy.decorator';
import { AmqpInspectionConfig } from '../utils/amqp-inspection.config';

type InpsectInput = {
  consumeMessage: Message;
  data: any;
  retrialPolicy?: RetrialPolicy;
  throttlePolicy?: ThrottlePolicy;
  binding?: BindingOptions;
  error?: any;
  status: string;
};

@Injectable()
export class AmqpInspectionService {
  private logger = new Logger(this.constructor.name);

  constructor(private readonly config: AmqpInspectionConfig) {
    if (!['inbound', 'all'].includes(config.inspectTraffic)) {
      this.inspectInbound = () => null;
    }
    if (!['outbound', 'all'].includes(config.inspectTraffic)) {
      this.inspectOutbound = () => null;
    }
  }

  private getLogLevel(error: any) {
    if (!error) {
      return 'log';
    }

    if (error instanceof BadRequestException) {
      return 'warn';
    }

    return 'error';
  }

  inspectOutbound(
    exchange: string,
    routingKey: string,
    content: object,
    properties?: MessageProperties,
    error?: any,
  ) {
    const logLevel = error ? 'error' : 'log';
    this.logger[logLevel]({
      message: `[AMQP] [OUTBOUND] [${exchange}] [${routingKey}]`,
      data: {
        binding: { exchange, routingKey },
        publishMessage: { content, properties },
      },
      error,
    });
  }

  inspectInbound(args: InpsectInput): void {
    const {
      binding,
      consumeMessage,
      data,
      retrialPolicy,
      throttlePolicy,
      error,
      status,
    } = args;

    const { exchange, routingKey, queue } = binding;
    const { content, fields, properties } = consumeMessage;
    const message = `[AMQP] [INBOUND] [${exchange}] [${routingKey}] [${queue}] [${status}]`;

    const logData = {
      binding,
      retrialPolicy,
      throttlePolicy,
      consumeMessage: {
        fields,
        properties,
        content: data ?? content.toString('utf8'),
      },
      error,
      status,
    };
    const logLevel = this.getLogLevel(error);
    this.logger[logLevel]({ message, data: logData });
  }
}
