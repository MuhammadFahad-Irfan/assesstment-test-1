import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Reads the `x-workspace-id` header and confirms the authenticated user is a
 * member of that workspace. Returns 403 otherwise. On success, the workspace id
 * is attached to the request for downstream handlers (via @WorkspaceId()).
 *
 * Must run after the JWT guard so that request.user is populated.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = request.headers['x-workspace-id'];

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new ForbiddenException('Missing x-workspace-id header');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Workspace does not belong to the current user',
      );
    }

    request.workspaceId = workspaceId;
    return true;
  }
}
