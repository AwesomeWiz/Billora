import { api, ApiError } from '../../../../lib/api/client';
import type {
  Product,
  ProductListParams,
  ProductListResponse,
  CreateProductInput,
  UpdateProductInput,
  ProductVariant,
  CreateVariantInput,
  UpdateVariantInput,
} from '../types';

function buildQuery(params?: ProductListParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.page !== undefined && params.page > 0) {
    searchParams.set('page', String(params.page));
  }
  if (params.page_size !== undefined && params.page_size > 0) {
    searchParams.set('page_size', String(params.page_size));
  }
  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }
  if (params.type?.trim()) {
    searchParams.set('type', params.type.trim());
  }
  if (params.active !== undefined && params.active !== '') {
    searchParams.set('active', params.active);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const productService = {
  async listProducts(params?: ProductListParams): Promise<ProductListResponse> {
    const query = buildQuery(params);
    const data = await api.get<ProductListResponse | Product[]>(`/products${query}`);

    // Normalize either paginated response or flat array
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        page_size: data.length,
        has_next: false,
      };
    }

    if (data && Array.isArray((data as ProductListResponse).items)) {
      return data as ProductListResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid product list format returned from API.');
  },

  async getProduct(id: string): Promise<Product> {
    return api.get<Product>(`/products/${encodeURIComponent(id)}`);
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    return api.post<Product>('/products', input);
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    return api.request<Product>(`/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    });
  },

  async listVariants(productId: string): Promise<ProductVariant[]> {
    const data = await api.get<ProductVariant[] | { items: ProductVariant[] }>(
      `/products/${encodeURIComponent(productId)}/variants`,
    );
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { items: ProductVariant[] }).items)) {
      return (data as { items: ProductVariant[] }).items;
    }
    return [];
  },

  async createVariant(productId: string, input: CreateVariantInput): Promise<ProductVariant> {
    return api.post<ProductVariant>(`/products/${encodeURIComponent(productId)}/variants`, input);
  },

  async updateVariant(
    productId: string,
    variantId: string,
    input: UpdateVariantInput,
  ): Promise<ProductVariant> {
    return api.request<ProductVariant>(
      `/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
      {
        method: 'PATCH',
        body: input,
      },
    );
  },

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    return api.request<void>(
      `/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
      {
        method: 'DELETE',
      },
    );
  },
};
