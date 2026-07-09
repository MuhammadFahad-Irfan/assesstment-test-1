import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';

@UseGuards(WorkspaceGuard)
@Controller('events/:eventId/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // Generate a proposal (saved as PENDING) — does NOT touch the budget table.
  @Post('chat')
  chat(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() dto: ChatDto,
  ) {
    return this.ai.chat(workspaceId, eventId, dto.message);
  }

  // The single pending proposal for this event, if one exists.
  @Get('proposals/pending')
  pending(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.ai.getPending(workspaceId, eventId);
  }

  @HttpCode(200)
  @Post('proposals/:proposalId/approve')
  approve(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.ai.approve(workspaceId, eventId, proposalId);
  }

  @HttpCode(200)
  @Post('proposals/:proposalId/reject')
  reject(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.ai.reject(workspaceId, eventId, proposalId);
  }
}
