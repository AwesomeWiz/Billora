import { StatusBadge, Button } from '../../../components/ui';
import type { QuotationTemplate } from '../types';

interface TemplateTableProps {
  templates: QuotationTemplate[];
  onView: (template: QuotationTemplate) => void;
}

export function TemplateTable({ templates, onView }: TemplateTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
      <table className="w-full text-left text-sm text-[#0F172A] border-collapse">
        <thead className="bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
          <tr>
            <th scope="col" className="px-4 py-3.5">Template Name</th>
            <th scope="col" className="px-4 py-3.5">Associated Plan</th>
            <th scope="col" className="px-4 py-3.5">Product Lines</th>
            <th scope="col" className="px-4 py-3.5">Validity</th>
            <th scope="col" className="px-4 py-3.5">Status</th>
            <th scope="col" className="px-4 py-3.5">Created Date</th>
            <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {templates.map((tpl) => {
            const lineCount = tpl.lines ? tpl.lines.length : 0;
            return (
              <tr
                key={tpl.id}
                className="hover:bg-[#F8FAFC] transition-colors"
                data-testid={`template-row-${tpl.id}`}
              >
                <td className="px-4 py-3 font-medium text-[#0F172A]">
                  <div>{tpl.name}</div>
                  <div className="text-xs text-[#94A3B8] font-mono mt-0.5">{tpl.id}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {tpl.plan_name || tpl.plan_id}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#475569]">
                  <span className="font-semibold text-[#0F172A]">{lineCount}</span> {lineCount === 1 ? 'product line' : 'product lines'}
                </td>
                <td className="px-4 py-3 text-xs text-[#475569]">
                  <span className="font-medium text-[#0F172A]">{tpl.validity_days} days</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={tpl.active ? 'active' : 'inactive'} />
                </td>
                <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                  {tpl.created_at ? tpl.created_at.slice(0, 10) : '—'}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    onClick={() => onView(tpl)}
                    className="text-xs h-7 px-2.5 text-[#5B4DDB] hover:text-[#4a3dc4]"
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
