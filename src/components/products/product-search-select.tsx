'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  className?: string;
  hasError?: boolean;
}

export function ProductSearchSelect({
  products = [],
  value = '',
  onSelectProduct,
  onChangeManual,
  onAddNewMaterial,
  disabled = false,
  placeholder = 'Search material or type name...',
  className,
  hasError = false,
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const updateCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    // Ensure dropdown stays within horizontal screen viewport
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }

    const top = openUpward
      ? Math.max(8, rect.top - dropdownHeight - 4)
      : rect.bottom + 4;

    setCoords({
      top,
      left,
      width,
      openUpward,
    });
  }, []);

  // Update coords when opening or scrolling/resizing
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleScrollOrResize = () => {
        updateCoords();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updateCoords]);

  // Handle outside click to close dropdown (checking both container and portaled dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inContainer = containerRef.current && containerRef.current.contains(target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

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
    if (!isOpen) {
      setIsOpen(true);
      updateCoords();
    }
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
        updateCoords();
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
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <Package className="absolute left-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            updateCoords();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "pl-8 pr-8 text-sm h-9 bg-white",
            hasError && "border-red-500 ring-2 ring-red-200 focus-visible:ring-red-500"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!disabled) {
              const nextState = !isOpen;
              setIsOpen(nextState);
              if (nextState) updateCoords();
              inputRef.current?.focus();
            }
          }}
          className="absolute right-2 text-gray-400 hover:text-gray-600 focus:outline-none p-0.5"
          title="Toggle dropdown"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      </div>

      {isOpen && mounted && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: '280px',
            zIndex: 99999,
          }}
          className="bg-white border border-gray-300 rounded-lg shadow-2xl py-1 text-sm flex flex-col animate-in fade-in zoom-in-95 duration-100"
        >
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
                    <div className="flex flex-col pr-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />}
                        <span className="font-medium text-gray-900 truncate">{product.item_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {product.item_code && <span>Code: {product.item_code}</span>}
                        {product.category && <span>• {product.category}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
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
              className="w-full text-left px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100/60 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors border border-dashed border-blue-300 bg-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>
                {searchTerm.trim()
                  ? `+ Add "${searchTerm.trim()}" to Rate List`
                  : '+ Add Manual Material (Save to Rate List)'}
              </span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
