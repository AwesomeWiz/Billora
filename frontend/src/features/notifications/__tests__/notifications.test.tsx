import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsPage } from '../pages/NotificationsPage';
import { notificationService } from '../services/notificationService';
import { ApiError } from '../../../lib/api/client';

vi.mock('../services/notificationService', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading notifications\.\.\./i)).toBeInTheDocument();
  });

  it('renders notification items and triggers mark as read', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'notif_1',
          created_at: '2026-10-31T10:00:00Z',
          category: 'BILLING',
          title: 'Invoice Generated',
          message: 'Invoice INV-001 has been generated.',
          is_read: false,
          entity_type: 'invoice',
          entity_id: 'inv_1',
        },
      ],
      total: 1,
      unread_count: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });
    vi.mocked(notificationService.markAsRead).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Invoice Generated')).toBeInTheDocument();
      expect(screen.getByText('Invoice INV-001 has been generated.')).toBeInTheDocument();
    });

    const markBtn = screen.getByRole('button', { name: /Mark read/i });
    fireEvent.click(markBtn);

    expect(notificationService.markAsRead).toHaveBeenCalledWith('notif_1');
  });

  it('handles backend 404 cleanly by showing informative banner', async () => {
    vi.mocked(notificationService.getNotifications).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Not found')
    );

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Backend Endpoint Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Awaiting backend `\/api\/notifications` service mount\./i)).toBeInTheDocument();
    });
  });

  it('supports mark all as read button when unread notifications exist', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'notif_1',
          created_at: '2026-10-31T10:00:00Z',
          category: 'BILLING',
          title: 'Invoice Generated',
          message: 'Invoice INV-001 has been generated.',
          is_read: false,
        },
      ],
      total: 1,
      unread_count: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark all as read/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Mark all as read/i }));
    expect(notificationService.markAllAsRead).toHaveBeenCalledTimes(1);
  });
});

