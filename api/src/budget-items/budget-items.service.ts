import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';

@Injectable()
export class BudgetItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async findAll(workspaceId: string, eventId: string) {
    await this.events.ensureOwned(workspaceId, eventId);
    return this.prisma.budgetItem.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    workspaceId: string,
    eventId: string,
    dto: CreateBudgetItemDto,
  ) {
    await this.events.ensureOwned(workspaceId, eventId);
    return this.prisma.budgetItem.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency.toUpperCase(),
        eventId,
      },
    });
  }

  async update(
    workspaceId: string,
    eventId: string,
    itemId: string,
    dto: UpdateBudgetItemDto,
  ) {
    await this.ensureItemInEvent(workspaceId, eventId, itemId);
    return this.prisma.budgetItem.update({
      where: { id: itemId },
      data: {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currency !== undefined && {
          currency: dto.currency.toUpperCase(),
        }),
      },
    });
  }

  async remove(workspaceId: string, eventId: string, itemId: string) {
    await this.ensureItemInEvent(workspaceId, eventId, itemId);
    await this.prisma.budgetItem.delete({ where: { id: itemId } });
    return { deleted: true, id: itemId };
  }

  private async ensureItemInEvent(
    workspaceId: string,
    eventId: string,
    itemId: string,
  ) {
    await this.events.ensureOwned(workspaceId, eventId);
    const item = await this.prisma.budgetItem.findFirst({
      where: { id: itemId, eventId },
      select: { id: true },
    });
    if (!item) {
      throw new NotFoundException('Budget item not found');
    }
  }
}
