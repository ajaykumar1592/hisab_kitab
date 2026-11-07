'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Download, Edit, Trash2, Eye, Package, MoreVertical, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  item_name: string;
  item_code: string;
  category: string;
  unit: string;
  quantity: number;
  rate: number;
  gst_percentage: number;
  final_rate: number;
  status: 'active' | 'inactive';
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

export default function RateListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('item_name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Mock data for UI demonstration
  const mockProducts: Product[] = [
    {
      id: '1',
      item_name: 'Cement (OPC 53 Grade)',
      item_code: 'CEM-001',
      category: 'Building Materials',
      unit: 'Bag',
      quantity: 1,
      rate: 350,
      gst_percentage: 28,
      final_rate: 448,
      status: 'active',
      created_at: '2024-01-10',
    },
    {
      id: '2',
      item_name: 'TMT Steel Bar 12mm',
      item_code: 'STL-001',
      category: 'Construction Materials',
      unit: 'Kg',
      quantity: 1,
      rate: 65,
      gst_percentage: 18,
      final_rate: 76.7,
      status: 'active',
      created_at: '2024-01-10',
    },
    {
      id: '3',
      item_name: 'River Sand',
      item_code: 'SND-001',
      category: 'Building Materials',
      unit: 'Cubic Feet',
      quantity: 1,
      rate: 45,
      gst_percentage: 5,
      final_rate: 47.25,
      status: 'active',
      created_at: '2024-01-09',
    },
    {
      id: '4',
      item_name: 'Red Bricks',
      item_code: 'BRK-001',
      category: 'Building Materials',
      unit: 'Piece',
      quantity: 1000,
      rate: 6,
      gst_percentage: 5,
      final_rate: 6.3,
      status: 'active',
      created_at: '2024-01-08',
    },
    {
      id: '5',
      item_name: 'White Cement',
      item_code: 'CEM-002',
      category: 'Building Materials',
      unit: 'Bag',
      quantity: 1,
      rate: 580,
      gst_percentage: 28,
      final_rate: 742.4,
      status: 'inactive',
      created_at: '2024-01-07',
    },
    {
      id: '6',
      item_name: 'PVC Pipe 1 inch',
      item_code: 'PVC-001',
      category: 'Plumbing',
      unit: 'Meter',
      quantity: 1,
      rate: 85,
      gst_percentage: 18,
      final_rate: 100.3,
      status: 'active',
      created_at: '2024-01-06',
    },
  ];

  const mockCategories: Category[] = [
    { id: '1', name: 'Building Materials' },
    { id: '2', name: 'Construction Materials' },
    { id: '3', name: 'Plumbing' },
    { id: '4', name: 'Electrical' },
    { id: '5', name: 'Paint & Hardware' },
  ];

  useEffect(() => {
    setProducts(mockProducts);
    setCategories(mockCategories);
  }, []);

  const filteredProducts = products
    .filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          p.item_name.toLowerCase().includes(query) ||
          p.item_code.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof Product];
      const bVal = b[sortBy as keyof Product];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const lowerA = aVal.toLowerCase();
        const lowerB = bVal.toLowerCase();
        if (sortOrder === 'asc') {
          return lowerA > lowerB ? 1 : -1;
        }
        return lowerA < lowerB ? 1 : -1;
      }

      if (sortOrder === 'asc') {
        return String(aVal) > String(bVal) ? 1 : -1;
      }
      return String(aVal) < String(bVal) ? 1 : -1;
    });

  const units = [
    'Piece', 'Kg', 'Gram', 'Litre', 'Millilitre', 'Meter', 'Feet',
    'Box', 'Packet', 'Dozen', 'Bag', 'Ton', 'Cubic Feet', 'Square Feet',
    'Roll', 'Set', 'Pair', 'Custom'
  ];

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <span className="text-gray-400 ml-1">⇅</span>;
    return sortOrder === 'asc' ? (
      <span className="text-blue-600 ml-1">↑</span>
    ) : (
      <span className="text-blue-600 ml-1">↓</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate List Master</h1>
          <p className="text-gray-500">Manage your product catalog and prices</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/rate-list/import">
              <Download className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/rate-list/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, code, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link href="/dashboard/pdf/rate-list" target="_blank">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead onClick={() => handleSort('item_name')} className="cursor-pointer select-none flex items-center gap-1">
                    Item Name <SortIcon column="item_name" />
                  </TableHead>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead onClick={() => handleSort('category')} className="cursor-pointer select-none flex items-center gap-1 hidden md:table-cell">
                    Category <SortIcon column="category" />
                  </TableHead>
                  <TableHead className="w-[100px]">Unit</TableHead>
                  <TableHead className="w-[80px] text-right">Qty</TableHead>
                  <TableHead onClick={() => handleSort('rate')} className="cursor-pointer select-none flex items-center gap-1 text-right">
                    Rate <SortIcon column="rate" />
                  </TableHead>
                  <TableHead className="w-[80px] text-right">GST%</TableHead>
                  <TableHead onClick={() => handleSort('final_rate')} className="cursor-pointer select-none flex items-center gap-1 text-right">
                    Final Rate <SortIcon column="final_rate" />
                  </TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Package className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No items found</p>
                        <Button asChild className="mt-4">
                          <Link href="/dashboard/rate-list/new">Add your first item</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell className="text-sm text-gray-500">{index + 1}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/rate-list/${product.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {product.item_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-500">{product.item_code}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{product.category}</TableCell>
                      <TableCell className="text-sm">{product.unit}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{product.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(product.rate)}</TableCell>
                      <TableCell className="text-right text-sm">{product.gst_percentage}%</TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(product.final_rate)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          product.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        )}>
                          {product.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="View">
                            <Link href={`/dashboard/rate-list/${product.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link href={`/dashboard/rate-list/${product.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => alert('Delete not implemented')} title="Delete">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}