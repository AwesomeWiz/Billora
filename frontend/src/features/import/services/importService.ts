import { api, ApiError } from '../../../lib/api/client';
import type {
  ImportEntityType,
  ImportPreviewResponse,
  ImportValidationResult,
  ImportExecutionResult,
  ImportColumnMapping,
} from '../types';

export const importService = {
  async previewCsv(file: File, entityType: ImportEntityType): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);

    // Using api client post
    try {
      return await api.post<ImportPreviewResponse>('/imports/preview', formData);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError(404, 'NOT_FOUND', 'CSV Import service (/api/imports/preview) is pending implementation in the backend.');
      }
      throw err;
    }
  },

  async validateImport(
    importId: string,
    mappings: ImportColumnMapping[]
  ): Promise<ImportValidationResult> {
    try {
      return await api.post<ImportValidationResult>('/imports/validate', {
        import_id: importId,
        mappings,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError(404, 'NOT_FOUND', 'CSV Import validation endpoint (/api/imports/validate) is pending implementation in the backend.');
      }
      throw err;
    }
  },

  async executeImport(
    importId: string,
    mappings: ImportColumnMapping[]
  ): Promise<ImportExecutionResult> {
    try {
      return await api.post<ImportExecutionResult>('/imports', {
        import_id: importId,
        mappings,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError(404, 'NOT_FOUND', 'CSV Import execution endpoint (/api/imports) is pending implementation in the backend.');
      }
      throw err;
    }
  },
};
