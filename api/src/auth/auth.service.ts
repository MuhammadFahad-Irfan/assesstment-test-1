import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Create a user, a workspace, and a membership linking them — atomically.
   * Returns a signed JWT plus the workspace id the client should send in
   * the x-workspace-id header.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { user, workspace } = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.workspaceName ?? `${dto.email}'s workspace` },
      });
      const user = await tx.user.create({
        data: { email: dto.email, password: passwordHash },
      });
      await tx.membership.create({
        data: { userId: user.id, workspaceId: workspace.id },
      });
      return { user, workspace };
    });

    return {
      accessToken: this.signToken(user.id, user.email),
      user: { id: user.id, email: user.email },
      workspaceId: workspace.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { select: { workspaceId: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: this.signToken(user.id, user.email),
      user: { id: user.id, email: user.email },
      // Convenience: the workspaces this user can act in.
      workspaceIds: user.memberships.map((m) => m.workspaceId),
    };
  }

  private signToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwt.sign(payload);
  }
}
