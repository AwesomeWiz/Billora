export interface GstSettings {
  gstin?: string;
  legal_business_name?: string;
  registered_state_code?: string;
  composition_scheme: boolean;
  e_invoicing_enabled: boolean;
  reverse_charge_applicable: boolean;
}

export interface GstIntelligenceSummary {
  total_tax_collected_minor: number;
  cgst_collected_minor: number;
  sgst_collected_minor: number;
  igst_collected_minor: number;
  pending_error_count: number;
  currency: string;
}

export interface GstTaxError {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  error_code: string;
  error_description: string;
  suggested_fix: string;
  status: 'PENDING_REVIEW' | 'ADMIN_APPROVED' | 'DISMISSED';
  detected_at: string;
}
