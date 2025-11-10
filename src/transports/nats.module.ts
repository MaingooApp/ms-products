import { Module } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
  type ClientProviderOptions,
  type NatsOptions,
} from '@nestjs/microservices';

import { NATS_SERVICE, envs } from 'src/config';

const natsOptions: NatsOptions = {
  transport: Transport.NATS,
  options: {
    servers: envs.natsServers,
    reconnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2000,
    timeout: 5000,
    name: 'ms-products',
    maxPayload: 20 * 1024 * 1024, // 20MB limit
  },
};

const natsClient: ClientProviderOptions = {
  ...natsOptions,
  name: NATS_SERVICE,
};

@Module({
  imports: [ClientsModule.register([natsClient])],
  exports: [ClientsModule],
})
export class NatsModule {}
