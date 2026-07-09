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
import { BudgetItemsService } from './budget-items.service';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';

@UseGuards(WorkspaceGuard)
@Controller('events/:eventId/budget-items')
export class BudgetItemsController {
  constructor(private readonly items: BudgetItemsService) {}

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.items.findAll(workspaceId, eventId);
  }

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateBudgetItemDto,
  ) {
    return this.items.create(workspaceId, eventId, dto);
  }

  @Patch(':itemId')
  update(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateBudgetItemDto,
  ) {
    return this.items.update(workspaceId, eventId, itemId, dto);
  }

  @Delete(':itemId')
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.items.remove(workspaceId, eventId, itemId);
  }
}
