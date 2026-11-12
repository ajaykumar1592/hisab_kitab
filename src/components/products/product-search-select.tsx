'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, Plus, Package, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Product {
  id: string;
  item_name: string;
  item_code: string | null;
  category?: string;
  category_id?: string;
  unit: string;
  quantity?: number;
  rate: number;
  gst_percentage: number;
  final_rate?: number;
  status: string;
  hsn_code?: string;
  description?: string;
}

interface ProductSearchSelectProps {
  products: Product[];
  value: string;
  onSelectProduct: (product: Product) => void;
  onChangeManual: (value: string) => void;
  onAddNewMaterial: (searchTerm: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ProductSearchSelect({
  products = [],
  value = '',
  onSelectProduct,
  onChangeManual,
  onAddNewMaterial,
  disabled = false,
  placeholder = 'Search material or type name...',
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = p.item_name?.toLowerCase().includes(term);
    const codeMatch = p.item_code ? p.item_code.toLowerCase().includes(term) : false;
    return Boolean(nameMatch || codeMatch);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchTerm(newVal);
    onChangeManual(newVal);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (product: Product) => {
    setSearchTerm(product.item_name);
    onSelectProduct(product);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleAddNew = () => {
    onAddNewMaterial(searchTerm);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredProducts.length - 1 ? prev + 1 : prev;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 0;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        handleSelect(filteredProducts[highlightedIndex]);
      } else if (filteredProducts.length === 0 && searchTerm.trim()) {
        handleAddNew();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const scrollIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-product-item]');
    const target = items[index] as HTMLElement;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Package className="absolute left-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="pl-8 pr-8 text-sm h-9"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }
          }}
          className="absolute right-2 text-gray-400 hover:text-gray-600 focus:outline-none p-0.5"
          title="Toggle dropdown"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 min-w-[280px] sm:min-w-[320px] max-h-72 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-xl py-1 text-sm flex flex-col">
          <div ref={listRef} className="overflow-y-auto flex-1 max-h-56 divide-y divide-gray-50">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, idx) => {
                const isSelected = value === product.item_name;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <button
                    key={product.id || `${product.item_name}-${idx}`}
                    data-product-item
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(product)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center justify-between transition-colors',
                      isHighlighted ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50',
                      isSelected && 'bg-blue-50/70 font-semibold'
                    )}
                  >
                    <div className="flex flex-col pr-2">
                      <div className="flex items-center gap-1.5">
                        {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />}
                        <span className="font-medium text-gray-900 line-clamp-1">{product.item_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {product.item_code && <span>Code: {product.item_code}</span>}
                        {product.category && <span>• {product.category}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-blue-600 font-bold">₹{product.rate}</span>
                      <span className="text-xs text-gray-500 ml-1">/{product.unit}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-xs text-gray-500 text-center">
                No matching materials found for &quot;{searchTerm}&quot;
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/80 p-1.5">
            <button
              type="button"
              onClick={handleAddNew}
              className="w-full text-left px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors border border-dashed border-blue-300 bg-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>
                {searchTerm.trim()
                  ? `+ Add "${searchTerm.trim()}" to Rate List`
                  : '+ Add Manual Material (Save to Rate List)'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
