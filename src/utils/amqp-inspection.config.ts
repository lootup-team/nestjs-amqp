export class AmqpInspectionConfig {
  constructor(
    readonly inspectTraffic: 'none' | 'all' | 'inbound' | 'outbound',
  ) {}
}
