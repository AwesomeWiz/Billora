export type ImportEntityType = 'customers' | 'products' | 'subscriptions';

export interface ImportColumnMapping {
  csv_header: string;
  target_field: string;
}

export interface ImportRowValidationError {
  row_number: number;
  field?: string;
  message: string;
  raw_data?: Record<string, string>;
}

export interface ImportPreviewResponse {
  total_rows: number;
  headers: string[];
  sample_rows: Record<string, string>[];
  detected_entity_type?: ImportEntityType;
  suggested_mappings?: ImportColumnMapping[];
}

export interface ImportValidationResult {
  valid_rows_count: number;
  invalid_rows_count: number;
  duplicate_rows_count: number;
  errors: ImportRowValidationError[];
}

export interface ImportExecutionResult {
  import_id: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  records_created: number;
  records_skipped: number;
  records_failed: number;
  errors: ImportRowValidationError[];
  completed_at: string;
}
