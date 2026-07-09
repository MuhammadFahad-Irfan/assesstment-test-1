import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export interface CategoryBreakdown {
  category: string;
  total: number;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(workspaceId: string, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        date: new Date(dto.date),
        currency: dto.currency.toUpperCase(),
        workspaceId,
      },
    });
  }

  /** List all events in the workspace, each with its total spend. */
  async findAll(workspaceId: string) {
    const events = await this.prisma.event.findMany({
      where: { workspaceId },
      orderBy: { date: 'asc' },
      include: { budgetItems: { select: { amount: true } } },
    });

    return events.map((event) => {
      const { budgetItems, ...rest } = event;
      const total = budgetItems.reduce((sum, i) => sum + Number(i.amount), 0);
      return { ...rest, totalSpend: this.round(total) };
    });
  }

  /**
   * Single event with a computed budget summary: total spend plus a per-category
   * breakdown. Throws 404 if the event is missing or belongs to another
   * workspace (so cross-workspace access leaks nothing).
   */
  async findOne(workspaceId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, workspaceId },
      include: { budgetItems: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const totalSpend = event.budgetItems.reduce(
      (sum, i) => sum + Number(i.amount),
      0,
    );

    const byCategory = new Map<string, number>();
    for (const item of event.budgetItems) {
      byCategory.set(
        item.category,
        (byCategory.get(item.category) ?? 0) + Number(item.amount),
      );
    }
    const breakdown: CategoryBreakdown[] = Array.from(byCategory.entries())
      .map(([category, total]) => ({ category, total: this.round(total) }))
      .sort((a, b) => b.total - a.total);

    return {
      ...event,
      budgetSummary: {
        currency: event.currency,
        totalSpend: this.round(totalSpend),
        breakdownByCategory: breakdown,
      },
    };
  }

  async update(workspaceId: string, id: string, dto: UpdateEventDto) {
    await this.ensureOwned(workspaceId, id);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.currency !== undefined && {
          currency: dto.currency.toUpperCase(),
        }),
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.ensureOwned(workspaceId, id);
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true, id };
  }

  /** Throws 404 unless the event exists and belongs to the workspace. */
  async ensureOwned(workspaceId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, workspaceId },
      select: { id: true, currency: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
