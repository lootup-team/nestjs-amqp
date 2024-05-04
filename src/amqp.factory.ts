import {
  RabbitMQChannelConfig,
  RabbitMQExchangeConfig,
  RabbitMQQueueConfig,
} from '@golevelup/nestjs-rabbitmq';

export type AmqpTrafficInspectionOptions = {
  mode?: 'none' | 'all' | 'inbound' | 'outbound';
  // TODO: Implement this
  // ignoredBindings: []
};

export type AmqpModuleOptions = {
  url: string;
  appName?: string;
  heartbeatIntervalInSeconds?: number;
  reconnectInSeconds?: number;
  exchanges?: RabbitMQExchangeConfig[];
  queues?: RabbitMQQueueConfig[];
  channels?: (RabbitMQChannelConfig & { name: string })[];
  trafficInspection?: AmqpTrafficInspectionOptions;
};

export interface AmqpOptionsFactory {
  createAmqpOptions(): AmqpModuleOptions | Promise<AmqpModuleOptions>;
}
