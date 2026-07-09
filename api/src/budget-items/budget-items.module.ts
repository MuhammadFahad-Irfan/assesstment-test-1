import { Module } from '@nestjs/common';
import { BudgetItemsController } from './budget-items.controller';
import { BudgetItemsService } from './budget-items.service';
import { EventsModule } from '../events/events.module';
import { WorkspaceGuard } from '../common/guards/workspace.guard';

@Module({
  imports: [EventsModule], // reuse EventsService.ensureOwned for scoping
  controllers: [BudgetItemsController],
  providers: [BudgetItemsService, WorkspaceGuard],
})
export class BudgetItemsModule {}
