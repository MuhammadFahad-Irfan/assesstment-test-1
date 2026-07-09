import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProposalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EventsGateway } from '../realtime/events.gateway';
import { GeminiService, ProposedItem } from './gemini.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly gemini: GeminiService,
    private readonly gateway: EventsGateway,
  ) {}

  /**
   * Generate a proposal via Gemini and save it as a PENDING action.
   * The AI never writes budget items directly — approval does that.
   *
   * Rules enforced here:
   *  - Only one pending proposal per event at a time.
   *  - Every proposed item must use the event's currency, else the whole
   *    proposal is rejected with an error and nothing is saved.
   */
  async chat(workspaceId: string, eventId: string, message: string) {
    const event = await this.getOwnedEvent(workspaceId, eventId);

    const pending = await this.prisma.proposal.findFirst({
      where: { eventId, status: ProposalStatus.PENDING },
    });
    if (pending) {
      throw new ConflictException(
        'A pending proposal already exists for this event. Approve or reject it first.',
      );
    }

    const items = await this.gemini.generateBudgetProposal(
      { title: event.title, date: event.date, currency: event.currency },
      message,
    );

    this.assertCurrencyMatches(items, event.currency);

    const proposal = await this.prisma.proposal.create({
      data: {
        eventId,
        userMessage: message,
        items: items as any, // stored as JSON
        status: ProposalStatus.PENDING,
      },
    });

    return {
      id: proposal.id,
      eventId,
      status: proposal.status,
      currency: event.currency,
      items,
      total: this.round(items.reduce((s, i) => s + i.amount, 0)),
      createdAt: proposal.createdAt,
    };
  }

  /**
   * Approve a pending proposal: write its items to the database atomically,
   * mark it APPROVED, and notify the workspace over Socket.IO.
   */
  async approve(workspaceId: string, eventId: string, proposalId: string) {
    const event = await this.getOwnedEvent(workspaceId, eventId);
    const proposal = await this.getPendingProposal(eventId, proposalId);

    const items = proposal.items as unknown as ProposedItem[];
    // Defensive re-check in case the event currency changed after proposal.
    this.assertCurrencyMatches(items, event.currency);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.budgetItem.createMany({
        data: items.map((i) => ({
          category: i.category,
          description: i.description,
          amount: i.amount,
          currency: event.currency,
          eventId,
        })),
      });
      await tx.proposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.APPROVED },
      });
      return tx.budgetItem.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
      });
    });

    // Tell every connected client in this workspace to refresh.
    this.gateway.emitBudgetUpdated(workspaceId, {
      eventId,
      reason: 'proposal-approved',
    });

    return {
      proposalId,
      eventId,
      status: ProposalStatus.APPROVED,
      addedItems: items.length,
      budgetItems: created,
    };
  }

  /** Reject a pending proposal. Nothing is written to the budget. */
  async reject(workspaceId: string, eventId: string, proposalId: string) {
    await this.getOwnedEvent(workspaceId, eventId);
    await this.getPendingProposal(eventId, proposalId);

    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.REJECTED },
    });

    return { proposalId, eventId, status: ProposalStatus.REJECTED };
  }

  /** Optional helper: current pending proposal for an event, if any. */
  async getPending(workspaceId: string, eventId: string) {
    await this.getOwnedEvent(workspaceId, eventId);
    return this.prisma.proposal.findFirst({
      where: { eventId, status: ProposalStatus.PENDING },
    });
  }

  // ---- helpers ----

  private async getOwnedEvent(workspaceId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private async getPendingProposal(eventId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, eventId },
    });
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new ConflictException(
        `Proposal is already ${proposal.status.toLowerCase()}`,
      );
    }
    return proposal;
  }

  private assertCurrencyMatches(items: ProposedItem[], currency: string) {
    const target = currency.toUpperCase();
    const mismatch = items.find((i) => i.currency.toUpperCase() !== target);
    if (mismatch) {
      throw new BadRequestException(
        `Proposal rejected: item currency "${mismatch.currency}" does not match event currency "${target}".`,
      );
    }
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
