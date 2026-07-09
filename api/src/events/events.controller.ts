import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';

// Every route here needs a valid JWT (global guard) AND a valid x-workspace-id
// (WorkspaceGuard). All queries are scoped to that workspace.
@UseGuards(WorkspaceGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateEventDto) {
    return this.events.create(workspaceId, dto);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string) {
    return this.events.findAll(workspaceId);
  }

  @Get(':id')
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.events.findOne(workspaceId, id);
  }

  @Patch(':id')
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(workspaceId, id, dto);
  }

  @Delete(':id')
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.events.remove(workspaceId, id);
  }
}
