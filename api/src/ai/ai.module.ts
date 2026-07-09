import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { EventsModule } from '../events/events.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WorkspaceGuard } from '../common/guards/workspace.guard';

@Module({
  imports: [EventsModule, RealtimeModule],
  controllers: [AiController],
  providers: [AiService, GeminiService, WorkspaceGuard],
})
export class AiModule {}
