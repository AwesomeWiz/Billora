import { useState, useEffect } from 'react';
import { PageHeader, Button, LoadingSkeleton, EmptyState, ErrorState } from '../../../components/ui';
import { useAuth } from '../../auth/AuthProvider';
import { useQuotationTemplates } from '../hooks/useQuotationTemplates';
import { quotationTemplateService } from '../services/quotationTemplateService';
import { TemplateFilters } from '../components/TemplateFilters';
import { TemplateTable } from '../components/TemplateTable';
import { TemplateFormModal } from '../components/TemplateFormModal';
import type { QuotationTemplate, CreateQuotationTemplateInput } from '../types';

import { planService } from '../../admin/plans/services/planService';
import { productService } from '../../admin/products/services/productService';
import { taxService } from '../../admin/taxes/services/taxService';
import type { Plan } from '../../admin/plans/types';
import type { Product, ProductVariant } from '../../admin/products/types';
import type { TaxRule } from '../../admin/taxes/types';

export function QuotationTemplatesPage() {
  const { state: authState } = useAuth();
  const isAuthorized =
    authState.status === 'authenticated' &&
    (authState.user.role === 'ADMIN' || authState.user.role === 'STAFF');

  const {
    templates,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh,
  } = useQuotationTemplates();

  // Reference catalog data
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsByProductId, setVariantsByProductId] = useState<Record<string, ProductVariant[]>>({});
  const [taxes, setTaxes] = useState<TaxRule[]>([]);

  // Modals
  const [isCreating, setIsCreating] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<QuotationTemplate | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadCatalogData() {
      try {
        const [plansRes, productsRes] = await Promise.all([
          planService.listPlans({ page_size: 100 }).catch(() => ({ items: [] })),
          productService.listProducts({ page_size: 100 }).catch(() => ({ items: [] })),
        ]);

        let taxItems: TaxRule[] = [];
        try {
          const taxesRes = await taxService.listTaxes({ page_size: 100 });
          taxItems = taxesRes.items || [];
        } catch {
          // taxes might be unavailable or 404
        }

        if (mounted) {
          setPlans(plansRes.items || []);
          setProducts(productsRes.items || []);
          setTaxes(taxItems);

          // Fetch variants for each product
          const variantMap: Record<string, ProductVariant[]> = {};
          await Promise.all(
            (productsRes.items || []).map(async (prod) => {
              try {
                const vars = await productService.listVariants(prod.id);
                variantMap[prod.id] = vars;
              } catch {
                variantMap[prod.id] = [];
              }
            })
          );
          if (mounted) {
            setVariantsByProductId(variantMap);
          }
        }
      } catch {
        // catalog dependencies unavailable
      }
    }

    loadCatalogData();
    return () => {
      mounted = false;
    };
  }, []);

  const hasFilterActive = Boolean(params.search?.trim() || params.plan_id || params.active);

  const handleCreateSubmit = async (data: CreateQuotationTemplateInput) => {
    await quotationTemplateService.createTemplate(data);
    await refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quotation Templates"
        description="Standardized, reusable proposal packages with preconfigured plans, line items, and validity durations."
        action={
          isAuthorized ? (
            <Button
              variant="primary"
              onClick={() => setIsCreating(true)}
              className="bg-[#5B4DDB] hover:bg-[#4a3dc4] text-white"
            >
              + Create Template
            </Button>
          ) : undefined
        }
      />

      {/* Backend API Unavailable Notice */}
      {isEndpointUnavailable && (
        <div
          className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm"
          role="status"
          data-testid="templates-unavailable-notice"
        >
          <div>
            <div className="font-semibold text-amber-900">
              Quotation Templates API Pending (/api/quotation-templates)
            </div>
            <div className="text-amber-700 text-xs mt-0.5">
              The backend quotation templates endpoint has not yet been mounted by Adithya. You can configure templates once the backend service is deployed.
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => void refresh()}
            className="text-amber-900 hover:bg-amber-100/80 border border-amber-300 w-fit shrink-0 text-xs h-7 px-2.5"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Filters Toolbar */}
      <TemplateFilters
        params={params}
        plans={plans}
        onChange={setParams}
        disabled={loading && templates.length === 0}
      />

      {/* Content Rendering */}
      {loading && templates.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm">
          <LoadingSkeleton lines={5} />
        </div>
      ) : error && !isEndpointUnavailable ? (
        <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm">
          <ErrorState
            title="Failed to Load Quotation Templates"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm">
          <EmptyState
            title={hasFilterActive ? 'No matching templates found' : 'No quotation templates configured'}
            description={
              hasFilterActive
                ? 'Try adjusting or clearing your search and filter criteria.'
                : isAuthorized
                ? 'Create reusable quotation templates with standard plans, product bundles, and validity periods to speed up sales quotes.'
                : 'No quotation templates have been configured yet.'
            }
            action={
              hasFilterActive ? (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setParams((prev) => ({
                      ...prev,
                      search: '',
                      plan_id: '',
                      active: '',
                      page: 1,
                    }))
                  }
                >
                  Clear Filters
                </Button>
              ) : isAuthorized ? (
                <Button
                  variant="primary"
                  onClick={() => setIsCreating(true)}
                  className="bg-[#5B4DDB] hover:bg-[#4a3dc4] text-white"
                >
                  Create First Template
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Showing {templates.length} {templates.length === 1 ? 'template' : 'templates'}
            {total > templates.length ? ` of ${total} total` : ''}
          </div>
          <TemplateTable
            templates={templates}
            onView={(tpl) => setViewingTemplate(tpl)}
          />
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <TemplateFormModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreateSubmit}
          plans={plans}
          products={products}
          variantsByProductId={variantsByProductId}
          taxes={taxes}
        />
      )}

      {/* View Details Modal */}
      {viewingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-template-title"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div>
                <h2 id="view-template-title" className="text-lg font-bold text-[#0F172A]">
                  {viewingTemplate.name}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {viewingTemplate.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Plan</span>
                  <span className="font-semibold text-blue-700">
                    {viewingTemplate.plan_name || viewingTemplate.plan_id}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Validity</span>
                  <span className="font-semibold text-[#0F172A]">
                    {viewingTemplate.validity_days} days
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className="font-semibold text-[#0F172A]">
                    {viewingTemplate.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Configured Product Lines ({viewingTemplate.lines?.length || 0})
                </h4>
                {viewingTemplate.lines && viewingTemplate.lines.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                    {viewingTemplate.lines.map((line, idx) => (
                      <div key={line.id || idx} className="p-3 bg-white flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium text-[#0F172A]">
                            {line.product_name || `Product: ${line.product_id}`}
                          </div>
                          {line.variant_name && (
                            <div className="text-xs text-slate-500">
                              Variant: {line.variant_name}
                            </div>
                          )}
                          <div className="text-xs text-slate-600 font-mono mt-0.5">
                            Quantity: {line.quantity}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          {line.unit_price_minor !== null && line.unit_price_minor !== undefined ? (
                            <div className="font-mono font-medium text-emerald-700">
                              ₹{(line.unit_price_minor / 100).toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">Catalog Price</div>
                          )}
                          {line.tax_rule_name && (
                            <div className="text-[11px] text-purple-700 font-medium">
                              Tax: {line.tax_rule_name}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No lines defined.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setViewingTemplate(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
