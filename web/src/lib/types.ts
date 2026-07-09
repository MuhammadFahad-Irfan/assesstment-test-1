export interface AuthUser {
  id: string;
  email: string;
}

export interface EventSummaryRow {
  id: string;
  title: string;
  date: string;
  currency: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  totalSpend: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  amount: string; // Prisma Decimal serializes as string
  currency: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
}

export interface EventDetail {
  id: string;
  title: string;
  date: string;
  currency: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  budgetItems: BudgetItem[];
  budgetSummary: {
    currency: string;
    totalSpend: number;
    breakdownByCategory: CategoryBreakdown[];
  };
}

export interface ProposedItem {
  category: string;
  description: string;
  amount: number;
  currency: string;
}

export interface Proposal {
  id: string;
  eventId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currency: string;
  items: ProposedItem[];
  total: number;
  createdAt: string;
}

// Shape returned by GET .../ai/proposals/pending (raw DB row) — items is JSON.
export interface PendingProposalRow {
  id: string;
  eventId: string;
  userMessage: string;
  items: ProposedItem[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
