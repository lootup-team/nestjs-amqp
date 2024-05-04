import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Message, MessageProperties } from 'amqplib';
import { AmqpModuleOptions } from '../amqp.factory';
import { MODULE_OPTIONS_TOKEN } from '../amqp.module-builder';
import { BindingOptions } from '../decorators/amqp-binding.decorator';
import { RetrialPolicy } from '../decorators/amqp-retrial-policy.decorator';
import { ThrottlePolicy } from '../decorators/amqp-throttle-policy.decorator';

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

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly config: AmqpModuleOptions,
  ) {
    const { mode = 'inbound' } = config.trafficInspection ?? {};
    if (!['inbound', 'all'].includes(mode)) {
      this.inspectInbound = () => null;
    }
    if (!['outbound', 'all'].includes(mode)) {
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
    const message = `[AMQP] [OUTBOUND] [${exchange}] [${routingKey}]`;
    const logData = {
      binding: { exchange, routingKey },
      message: { content, properties },
    };
    this.logger[logLevel]({
      message,
      amqp: logData,
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
      message: {
        fields,
        properties,
        content: data ?? content.toString('utf8'),
      },
      error,
      status,
    };
    const logLevel = this.getLogLevel(error);
    this.logger[logLevel]({ message, amqp: logData });
  }
}
