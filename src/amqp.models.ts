import { ModuleMetadata } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ConsumeMessage } from 'amqplib';
import { AmqpConnection } from './amqp.connection';

/** TODO: we should receive an options asserts object with queues and exchnges to assert during startup */
export type AmqpConnectionOptions = {
  url: string;
};

export type AmqpModuleOptions = AmqpConnectionOptions & {
  isGlobal?: boolean;
};

export interface AmqpModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  isGlobal?: boolean;
  useFactory?: (...args: any[]) => AmqpConnectionOptions;
}

export type AmqpExchangeType = 'direct' | 'topic';

export class AmqpExchangeController {
  constructor(
    readonly name: string,
    readonly type: AmqpExchangeType = 'topic',
  ) {}

  get dlx() {
    return `${this.name}.dlx`;
  }

  get queues() {
    return {
      main: `${this.name}.main`,
      retry: `${this.name}.retry`,
    };
  }
}

export type AmqpExchangeOption = {
  name: string;
  type?: AmqpExchangeType;
  bindToExchanges?: [
    {
      name: string;
      routingKey: string;
    },
  ];
};

export type AmqpRetryOptions = {
  limit?: number;
  interval?: number;
  maxInterval?: number;
};

export type AmqpExchangeTransportOptions = {
  url?: string;
  connection?: AmqpConnection;
  consumerId?: symbol;
  exchange: AmqpExchangeOption;
  retry?: AmqpRetryOptions;
};

export type Message = ConsumeMessage;
export type MessageHeaders = Record<string, any>;

export const ControlHeaders = {
  AttemptCount: 'x-attempt-count',
  OriginalRoutingKey: 'x-original-routing-key',
  FailedHandlerRoutingKey: 'x-failed-handler-routing-key',
  DeadReason: 'x-dead-reason',
} as const;

export type MessageOptions = {
  headers?: Record<string, any>;
  expiration?: number;
};

export class AmqpException extends RpcException {}
