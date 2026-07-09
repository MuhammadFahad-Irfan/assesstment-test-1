import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';

@Module({
  controllers: [EventsController],
  providers: [EventsService, WorkspaceGuard],
  exports: [EventsService],
})
export class EventsModule {}
