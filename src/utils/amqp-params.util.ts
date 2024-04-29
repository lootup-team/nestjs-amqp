export enum AmqpParams {
  DefaultExchange = '',
  DelayedExchange = 'delayed.retrial.v1.exchange',
  RerouterQueue = 'delayed.retrial.v1.rerouter.queue',
  AttemptCountHeader = 'x-attempt-count',
  RoutingKeyHeader = 'x-original-routing-key',
  DelayHeader = 'x-delay',
  DeadLetterReason = 'x-dead-letter-reason',
}
