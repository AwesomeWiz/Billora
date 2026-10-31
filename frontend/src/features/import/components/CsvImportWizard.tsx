import React, { useState } from 'react';
import { PageHeader, Button, StatusBadge } from '../../../components/ui';
import { importService } from '../services/importService';
import { ApiError } from '../../../lib/api/client';
import type {
  ImportEntityType,
  ImportPreviewResponse,
  ImportExecutionResult,
} from '../types';

export const CsvImportWizard: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>('customers');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.csv')) {
        setError('Please select a valid .csv file.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }
    setLoading(true);
    setError(null);
    setIsEndpointUnavailable(false);

    try {
      const res = await importService.previewCsv(file, selectedEntity);
      setPreview(res);
      setStep(2);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setIsEndpointUnavailable(true);
        setError('The CSV Import endpoint (/api/imports/preview) is pending implementation in the backend.');
      } else if (err instanceof ApiError) {
        setError(err.message || 'Failed to preview CSV file.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during preview.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await importService.executeImport('preview_session_id', []);
      setExecutionResult(result);
      setStep(3);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setIsEndpointUnavailable(true);
        setError('The CSV Import execution endpoint (/api/imports) is pending implementation in the backend.');
      } else if (err instanceof ApiError) {
        setError(err.message || 'Failed to execute CSV import.');
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CSV Data Import"
        description="Migrate existing customer accounts and catalog blueprints via structured CSV files."
      />

      {/* Backend 404 Notice Banner */}
      {isEndpointUnavailable && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r text-amber-900 shadow-sm"
        >
          <div className="flex items-start">
            <div className="flex-1">
              <h4 className="text-sm font-semibold">Backend Endpoint Notice</h4>
              <p className="mt-1 text-xs text-amber-700">
                CSV import ingestion services (`/api/imports/preview` and `/api/imports`) are pending backend implementation.
                In accordance with Billora financial and data integrity rules, client-side data simulation is disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* General Error Notice */}
      {error && !isEndpointUnavailable && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm"
        >
          <span className="font-semibold">Error: </span>
          {error}
        </div>
      )}

      {/* Wizard Steps */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Step 1: Select Entity and Upload CSV</h3>
            
            <div className="max-w-md space-y-4">
              <div>
                <label htmlFor="import-target-entity" className="block text-xs font-medium text-gray-700 mb-1">Target Entity</label>
                <select
                  id="import-target-entity"
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value as ImportEntityType)}
                  className="w-full text-sm rounded-md border border-gray-300 py-2 px-3 bg-white"
                  disabled={loading}
                >
                  <option value="customers">Customers (Name, Email, Tax ID)</option>
                  <option value="products">Products (Name, Type, Sales Price)</option>
                  <option value="subscriptions">Subscriptions (Customer ID, Plan ID)</option>
                </select>
              </div>

              <div>
                <label htmlFor="import-csv-file" className="block text-xs font-medium text-gray-700 mb-1">CSV File</label>
                <input
                  id="import-csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleUploadAndPreview}
                  disabled={!file || loading}
                >
                  {loading ? 'Uploading & Parsing...' : 'Upload & Preview'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Step 2: Preview & Validation</h3>
            <p className="text-xs text-gray-500">
              Found {preview.total_rows} rows in uploaded CSV. Inspect sample rows below before confirming import.
            </p>

            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="py-2 px-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.sample_rows.map((row, idx) => (
                    <tr key={idx}>
                      {preview.headers.map((h) => (
                        <td key={h} className="py-2 px-3">{row[h] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmImport}
                disabled={loading}
              >
                {loading ? 'Executing Import...' : 'Confirm & Execute Import'}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && executionResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">Import Summary</h3>
              <StatusBadge
                status={executionResult.status}
                tone={executionResult.status === 'COMPLETED' ? 'success' : 'warning'}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">Created</span>
                <span className="text-xl font-bold text-gray-900">{executionResult.records_created}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">Skipped</span>
                <span className="text-xl font-bold text-gray-900">{executionResult.records_skipped}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">Failed</span>
                <span className="text-xl font-bold text-red-600">{executionResult.records_failed}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setExecutionResult(null);
                setStep(1);
              }}
            >
              Start New Import
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
