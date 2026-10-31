import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CsvImportWizard } from '../components/CsvImportWizard';
import { importService } from '../services/importService';
import { ApiError } from '../../../lib/api/client';

vi.mock('../services/importService', () => ({
  importService: {
    previewCsv: vi.fn(),
    validateImport: vi.fn(),
    executeImport: vi.fn(),
  },
}));

describe('CsvImportWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 1 with upload options', () => {
    render(
      <MemoryRouter>
        <CsvImportWizard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Step 1: Select Entity and Upload CSV/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload & Preview/i })).toBeDisabled();
  });

  it('handles backend 404 cleanly by showing informative banner on upload attempt', async () => {
    vi.mocked(importService.previewCsv).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Not found')
    );

    render(
      <MemoryRouter>
        <CsvImportWizard />
      </MemoryRouter>
    );

    const file = new File(['name,email\nAcme,acme@example.com'], 'customers.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText(/CSV File/i) || document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByRole('button', { name: /Upload & Preview/i });
    expect(uploadBtn).not.toBeDisabled();
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByText(/Backend Endpoint Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/CSV import ingestion services \(`\/api\/imports\/preview` and `\/api\/imports`\) are pending backend implementation\./i)).toBeInTheDocument();
    });
  });
});
