import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';

// AuthModule re-exports JwtModule, giving the gateway access to JwtService
// for verifying the JWT sent during the Socket.IO handshake.
@Module({
  imports: [AuthModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class RealtimeModule {}
