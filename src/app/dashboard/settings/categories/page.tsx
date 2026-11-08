'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Search, Edit2, Trash2, Layers, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  item_count?: number;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Building Materials', description: 'Cement, sand, bricks, aggregates, and masonry items', item_count: 3 },
  { id: '2', name: 'Construction Materials', description: 'TMT steel bars, rods, wire mesh, and structural steel', item_count: 2 },
  { id: '3', name: 'Plumbing', description: 'PVC pipes, GI fittings, CPVC, taps, and plumbing supplies', item_count: 1 },
  { id: '4', name: 'Electrical', description: 'Wires, cables, switches, sockets, and electrical fittings', item_count: 0 },
  { id: '5', name: 'Paint & Hardware', description: 'Wall paints, primers, brushes, screws, and fasteners', item_count: 0 },
];

export default function CategoriesPage() {
  const router = useRouter();
  const { t, language } = useTranslation();

  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      console.warn('Could not read session token', e);
    }
    return headers;
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/categories', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.categories && data.categories.length > 0) {
          setCategories(data.categories);
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setError(null);
    setIsDialogOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(language === 'hi' ? 'श्रेणी का नाम आवश्यक है' : 'Category name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      if (editingCategory) {
        // Update category
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || 'Failed to update category');
        }

        setCategories(prev =>
          prev.map(c => (c.id === editingCategory.id ? { ...c, ...formData } : c))
        );
        setSuccess(language === 'hi' ? 'श्रेणी सफलतापूर्वक अपडेट की गई!' : 'Category updated successfully!');
      } else {
        // Create category
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers,
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || 'Failed to create category');
        }

        const data = await res.json();
        const newCat = data.category || {
          id: Date.now().toString(),
          name: formData.name,
          description: formData.description,
          item_count: 0,
        };

        setCategories(prev => [...prev, newCat]);
        setSuccess(language === 'hi' ? 'नई श्रेणी सफलतापूर्वक जोड़ी गई!' : 'Category added successfully!');
      }

      setIsDialogOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmMsg =
      language === 'hi'
        ? `क्या आप वाकई "${name}" श्रेणी हटाना चाहते हैं?`
        : `Are you sure you want to delete category "${name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/categories/${id}`, { method: 'DELETE', headers });
      setCategories(prev => prev.filter(c => c.id !== id));
      setSuccess(language === 'hi' ? 'श्रेणी हटा दी गई' : 'Category removed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-6 w-6 text-blue-600" />
              {language === 'hi' ? 'सामग्री श्रेणियाँ (Material Categories)' : 'Material Categories'}
            </h1>
            <p className="text-gray-500 text-sm">
              {language === 'hi'
                ? 'अपने उत्पादों और रेट लिस्ट के लिए श्रेणियां प्रबंधित करें'
                : 'Organize your rate list items into distinct product & material categories'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            {language === 'hi' ? 'नई श्रेणी जोड़ें' : 'Add Category'}
          </Button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && !isDialogOpen && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">
                {language === 'hi' ? 'सभी श्रेणियां' : 'All Categories'} ({filteredCategories.length})
              </CardTitle>
              <CardDescription>
                {language === 'hi' ? 'रेट लिस्ट में उत्पादों को वर्गीकृत करने के लिए प्रयुक्त' : 'Used across rate list to classify your products and raw materials'}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={language === 'hi' ? 'श्रेणी खोजें...' : 'Search categories...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>{language === 'hi' ? 'श्रेणी का नाम' : 'Category Name'}</TableHead>
                  <TableHead className="hidden md:table-cell">{language === 'hi' ? 'विवरण' : 'Description'}</TableHead>
                  <TableHead className="text-right">{language === 'hi' ? 'क्रियाएँ' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      {language === 'hi' ? 'कोई श्रेणी नहीं मिली' : 'No categories found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((cat, idx) => (
                    <TableRow key={cat.id} className="hover:bg-gray-50">
                      <TableCell className="text-center text-xs font-mono text-gray-500">{idx + 1}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900">{cat.name}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {cat.description || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(cat)}
                            className="h-8 px-2 text-blue-600 hover:text-blue-700"
                            title={language === 'hi' ? 'संपादित करें' : 'Edit'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="h-8 px-2 text-red-600 hover:text-red-700"
                            title={language === 'hi' ? 'हटाएँ' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Modal / Dialog for Add / Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-gray-900">
              {editingCategory
                ? language === 'hi'
                  ? 'श्रेणी संपादित करें'
                  : 'Edit Category'
                : language === 'hi'
                ? 'नई श्रेणी जोड़ें'
                : 'Add New Category'}
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="catName">{language === 'hi' ? 'श्रेणी का नाम *' : 'Category Name *'}</Label>
                <Input
                  id="catName"
                  placeholder={language === 'hi' ? 'उदा. सीमेंट, सरिया, पाइप...' : 'e.g. Cement, Steel, Pipes...'}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catDesc">{language === 'hi' ? 'विवरण (वैकल्पिक)' : 'Description (Optional)'}</Label>
                <Textarea
                  id="catDesc"
                  placeholder={language === 'hi' ? 'इस श्रेणी के उत्पादों के बारे में कुछ शब्द...' : 'Brief notes about materials in this category...'}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory
                    ? language === 'hi'
                      ? 'सुरक्षित करें'
                      : 'Save Changes'
                    : language === 'hi'
                    ? 'श्रेणी बनाएँ'
                    : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
