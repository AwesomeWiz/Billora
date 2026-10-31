import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError, errorMessage } from '../../../../lib/api/client';
import { productService } from '../services/productService';
import type { Product, ProductListParams } from '../types';

export interface UseProductsResult {
  products: Product[];
  total: number;
  loading: boolean;
  error: string | null;
  isEndpointUnavailable: boolean;
  params: ProductListParams;
  setParams: (updater: ProductListParams | ((prev: ProductListParams) => ProductListParams)) => void;
  refresh: () => Promise<void>;
}

export function useProducts(initialParams: ProductListParams = {}): UseProductsResult {
  const [params, setParams] = useState<ProductListParams>(initialParams);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const mountedRef = useRef(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsEndpointUnavailable(false);

    try {
      const response = await productService.listProducts(params);
      if (!mountedRef.current) return;
      setProducts(response.items);
      setTotal(response.total);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof ApiError && (err.status === 404 || err.status === 0 || err.code === 'HTTP_404')) {
        setIsEndpointUnavailable(true);
        setError('The catalog backend endpoint (/api/products) is not yet available.');
      } else {
        setError(errorMessage(err));
      }
      setProducts([]);
      setTotal(0);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchProducts();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchProducts]);

  return {
    products,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh: fetchProducts,
  };
}
