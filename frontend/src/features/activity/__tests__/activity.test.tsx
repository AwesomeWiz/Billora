import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivityTimelinePage } from '../pages/ActivityTimelinePage';
import { activityService } from '../services/activityService';
import { ApiError } from '../../../lib/api/client';

vi.mock('../services/activityService', () => ({
  activityService: {
    getActivityFeed: vi.fn(),
  },
}));

describe('ActivityTimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    vi.mocked(activityService.getActivityFeed).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <ActivityTimelinePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading system activity logs\.\.\./i)).toBeInTheDocument();
  });

  it('renders activity feed items and handles links safely', async () => {
    vi.mocked(activityService.getActivityFeed).mockResolvedValue({
      items: [
        {
          id: 'act_1',
          timestamp: '2026-10-31T10:00:00Z',
          actor: { id: 'usr_1', email: 'admin@billora.com', name: 'Admin User', role: 'ADMIN' },
          event_type: 'SUBSCRIPTION_ACTIVATED',
          entity_type: 'subscription',
          entity_id: 'sub_123',
          entity_label: 'SUB-123',
          description: 'Activated subscription for Acme Corp.',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });

    render(
      <MemoryRouter>
        <ActivityTimelinePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Activated subscription for Acme Corp.')).toBeInTheDocument();
      expect(screen.getAllByText('Subscription Activated').length).toBeGreaterThan(0);
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /View SUB-123 →/i });
    expect(link).toHaveAttribute('href', '/app/subscriptions/sub_123');
  });

  it('handles backend 404 cleanly by showing informative banner', async () => {
    vi.mocked(activityService.getActivityFeed).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Not found')
    );

    render(
      <MemoryRouter>
        <ActivityTimelinePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Backend Endpoint Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Awaiting backend `\/api\/activity` audit service mount\./i)).toBeInTheDocument();
    });
  });

  it('supports filters and triggers refetch', async () => {
    vi.mocked(activityService.getActivityFeed).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      has_next: false,
    });

    render(
      <MemoryRouter>
        <ActivityTimelinePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search description, entity\.\.\./i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search description, entity\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'invoice' } });

    expect(screen.getByRole('button', { name: /Reset Filters/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reset Filters/i }));
  });
});
