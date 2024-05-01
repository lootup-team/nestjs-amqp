import { ConfigService } from '@nestjs/config';
import { hostname } from 'os';
import { AmqpModuleOptions } from '../amqp.factory';

export const getConnectionName = (
  options: AmqpModuleOptions,
  config: ConfigService,
) => {
  if (options.appName) {
    return options.appName;
  }
  const serviceName = config.get('SERVICE_NAME');
  if (serviceName) {
    return serviceName;
  }
  const packageName = config.get('npm_package_name');
  const packageVersion = config.get('npm_package_version');
  const host = hostname();
  return `${host}::${packageName}@${packageVersion}`;
};
