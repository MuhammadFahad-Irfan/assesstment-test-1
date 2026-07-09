import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

/**
 * Authenticated Socket.IO gateway.
 *
 * A client connects with:
 *   io(url, { auth: { token: <JWT>, workspaceId: <id> } })
 *
 * We verify the JWT and confirm the user is a member of the requested
 * workspace, then join the socket to a per-workspace room. Budget updates are
 * broadcast only to that room, so tenants never see each other's traffic.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ??
        this.fromAuthHeader(client.handshake.headers?.authorization);
      const workspaceId = client.handshake.auth?.workspaceId as
        | string
        | undefined;

      if (!token || !workspaceId) {
        return this.reject(client, 'Missing token or workspaceId');
      }

      const payload = this.jwt.verify<JwtPayload>(token);

      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_workspaceId: { userId: payload.sub, workspaceId },
        },
      });
      if (!membership) {
        return this.reject(client, 'Not a member of this workspace');
      }

      client.join(this.room(workspaceId));
      client.data.userId = payload.sub;
      client.data.workspaceId = workspaceId;
      this.logger.log(
        `Socket ${client.id} joined workspace ${workspaceId}`,
      );
    } catch {
      this.reject(client, 'Invalid token');
    }
  }

  /** Broadcast to every client in a workspace that budget data changed. */
  emitBudgetUpdated(
    workspaceId: string,
    payload: { eventId: string; reason: string },
  ) {
    this.server.to(this.room(workspaceId)).emit('budget:updated', payload);
  }

  private room(workspaceId: string) {
    return `workspace:${workspaceId}`;
  }

  private fromAuthHeader(header?: string): string | undefined {
    if (!header) return undefined;
    const [type, value] = header.split(' ');
    return type === 'Bearer' ? value : undefined;
  }

  private reject(client: Socket, reason: string) {
    this.logger.warn(`Rejecting socket ${client.id}: ${reason}`);
    client.emit('error', { message: reason });
    client.disconnect(true);
  }
}
