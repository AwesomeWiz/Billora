import React, { useState, useEffect } from 'react';
import { PageHeader, Button, StatusBadge } from '../../../components/ui';
import { gstService } from '../services/gstService';
import { ApiError } from '../../../lib/api/client';
import type { GstSettings, GstIntelligenceSummary, GstTaxError } from '../types';

export const GstManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'errors'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const [summary, setSummary] = useState<GstIntelligenceSummary | null>(null);
  const [settings, setSettings] = useState<GstSettings | null>(null);
  const [errors, setErrors] = useState<GstTaxError[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setIsEndpointUnavailable(false);

    try {
      const [sum, sett, errs] = await Promise.all([
        gstService.getIntelligenceSummary(),
        gstService.getSettings(),
        gstService.getTaxErrors(),
      ]);
      setSummary(sum);
      setSettings(sett);
      setErrors(errs);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setIsEndpointUnavailable(true);
        setError('The GST Intelligence & Compliance endpoints (/api/gst/*) are pending implementation in the backend.');
      } else if (err instanceof ApiError) {
        setError(err.message || 'Failed to load GST management data.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading GST compliance records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    if (approvingId) return;
    setApprovingId(id);
    try {
      await gstService.approveTaxFix(id);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to approve tax fix.');
      }
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Compliance & Intelligence"
        description="Monitor goods and services tax collections, compliance rules, and review tax anomalies."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
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
                GST Phase 3E services (`/api/gst/*`) are pending backend implementation. In strict compliance
                with Billora financial architecture rules, no simulated tax numbers or mock compliance approvals are displayed.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={fetchData}
              disabled={loading}
              className="ml-4 text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && !isEndpointUnavailable && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          <span className="font-semibold">Error: </span> {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Intelligence Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('errors')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'errors'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tax Error Review ({errors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            GST Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading GST records...</p>
        </div>
      ) : isEndpointUnavailable ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">
            Awaiting backend `/api/gst/*` service connection.
          </p>
        </div>
      ) : activeTab === 'overview' && summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Tax Collected</span>
            <span className="mt-2 text-2xl font-bold text-gray-900 font-mono block">
              ₹{(summary.total_tax_collected_minor / 100).toFixed(2)}
            </span>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">CGST Collected</span>
            <span className="mt-2 text-2xl font-bold text-gray-900 font-mono block">
              ₹{(summary.cgst_collected_minor / 100).toFixed(2)}
            </span>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">SGST Collected</span>
            <span className="mt-2 text-2xl font-bold text-gray-900 font-mono block">
              ₹{(summary.sgst_collected_minor / 100).toFixed(2)}
            </span>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">IGST Collected</span>
            <span className="mt-2 text-2xl font-bold text-gray-900 font-mono block">
              ₹{(summary.igst_collected_minor / 100).toFixed(2)}
            </span>
          </div>
        </div>
      ) : activeTab === 'errors' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {errors.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No tax errors or discrepancies pending administrative review.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Invoice</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold">Error & Explanation</th>
                  <th className="py-2.5 px-4 font-semibold">Suggested Fix</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {errors.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 font-medium text-gray-900">{item.invoice_number}</td>
                    <td className="py-3 px-4 text-gray-700">{item.customer_name}</td>
                    <td className="py-3 px-4 text-gray-700">{item.error_description}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono">{item.suggested_fix}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} tone={item.status === 'PENDING_REVIEW' ? 'warning' : 'success'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'PENDING_REVIEW' && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleApprove(item.id)}
                          disabled={approvingId === item.id}
                          className="text-xs py-1 px-2.5"
                        >
                          {approvingId === item.id ? 'Approving...' : 'Approve Fix'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'settings' && settings ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-lg space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Registered Business GST Profile</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
            <input
              type="text"
              readOnly
              value={settings.gstin || 'Not configured'}
              className="w-full text-sm rounded-md border border-gray-300 py-1.5 px-3 bg-gray-50 text-gray-700 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Legal Business Name</label>
            <input
              type="text"
              readOnly
              value={settings.legal_business_name || 'Not configured'}
              className="w-full text-sm rounded-md border border-gray-300 py-1.5 px-3 bg-gray-50 text-gray-700"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
