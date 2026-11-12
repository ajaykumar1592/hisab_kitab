'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Trash2,
  KeyRound,
  Shield,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserX,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface AppUser {
  id: string;
  member_id?: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'member' | 'staff';
  status: 'active' | 'inactive';
  assigned_password?: string;
  created_at?: string;
  last_sign_in_at?: string | null;
}

export default function UsersPage() {
  const { language } = useTranslation();
  const isHindi = language === 'hi';

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Revealed passwords state: set of userIds whose password is currently visible
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'member' as AppUser['role'],
    status: 'active' as AppUser['status'],
  });
  const [showAddPassword, setShowAddPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'member' as AppUser['role'],
    status: 'active' as AppUser['status'],
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const getAuthHeaders = useCallback(async () => {
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
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/users', { headers });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error?.message || 'Failed to load users');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching users');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, pass: string) => {
    if (!pass) return;
    navigator.clipboard.writeText(pass);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (user: AppUser) => {
    try {
      setActionLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/users/${user.id}/toggle-status`, {
        method: 'PATCH',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to toggle status');
      }
      setSuccess(`${user.full_name || user.email} is now ${data.status}`);
      setTimeout(() => setSuccess(null), 3000);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email || !addForm.password) {
      setError(isHindi ? 'कृपया ईमेल और पासवर्ड भरें' : 'Please provide email and password');
      return;
    }
    if (addForm.password.length < 6) {
      setError(isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to add user');
      }
      setSuccess(isHindi ? 'उपयोगकर्ता सफलतापूर्वक जोड़ा गया!' : 'User created successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowAddModal(false);
      setAddForm({
        full_name: '',
        email: '',
        password: '',
        role: 'member',
        status: 'active',
      });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error creating user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update user');
      }
      setSuccess(isHindi ? 'उपयोगकर्ता विवरण अपडेट कर दिया गया है' : 'User updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error updating user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setError(isHindi ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'New password must be at least 6 characters');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password: passwordForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to change password');
      }
      setSuccess(isHindi ? 'पासवर्ड सफलतापूर्वक बदल दिया गया!' : 'Password changed successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowPasswordModal(false);
      setPasswordForm({ newPassword: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error changing password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to delete user');
      }
      setSuccess(isHindi ? 'उपयोगकर्ता सफलतापूर्वक हटा दिया गया' : 'User deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error deleting user');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (user: AppUser) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || 'member',
      status: user.status || 'active',
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user: AppUser) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: '' });
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  const openDeleteModal = (user: AppUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = u.full_name?.toLowerCase().includes(term);
    const emailMatch = u.email?.toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || emailMatch;

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const activeCount = users.filter(u => u.status === 'active').length;
  const inactiveCount = users.filter(u => u.status === 'inactive').length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'owner').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-blue-600" />
            <span>{isHindi ? 'उपयोगकर्ता प्रबंधन' : 'Users Management'}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isHindi ? 'स्टाफ, एडमिन और उपयोगकर्ताओं को जोड़ें, एडिट करें, पासवर्ड देखें व बदलें' : 'Manage staff, admins, view/change passwords, and control access'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-1.5 border-slate-300 text-slate-800 hover:text-slate-900 hover:bg-slate-100 font-semibold shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-600", loading && "animate-spin")} />
            <span className="hidden sm:inline">{isHindi ? 'रिफ्रेश' : 'Refresh'}</span>
          </Button>

          <Button
            onClick={() => {
              setShowAddPassword(false);
              setShowAddModal(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>{isHindi ? '+ नया उपयोगकर्ता जोड़ें' : '+ Add User'}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{isHindi ? 'कुल उपयोगकर्ता' : 'Total Users'}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <p className="text-xs text-green-700 font-medium">{isHindi ? 'सक्रिय (Active)' : 'Active Users'}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-red-700 font-medium">{isHindi ? 'निष्क्रिय (Inactive)' : 'Inactive Users'}</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{inactiveCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-purple-200">
          <CardContent className="p-4">
            <p className="text-xs text-purple-700 font-medium">{isHindi ? 'एडमिन / मालिक' : 'Admins / Owners'}</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{adminCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={isHindi ? 'नाम या ईमेल से खोजें...' : 'Search by name or email...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHindi ? 'सभी रोल' : 'All Roles'}</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHindi ? 'सभी स्थिति' : 'All Status'}</SelectItem>
                  <SelectItem value="active">{isHindi ? 'सक्रिय (Active)' : 'Active'}</SelectItem>
                  <SelectItem value="inactive">{isHindi ? 'निष्क्रिय (Inactive)' : 'Inactive'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">{isHindi ? 'उपयोगकर्ता लोड हो रहे हैं...' : 'Loading users...'}</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center bg-white border-dashed">
          <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? (isHindi ? 'कोई उपयोगकर्ता नहीं मिला' : 'No users match your filters')
              : (isHindi ? 'कोई उपयोगकर्ता मौजूद नहीं है' : 'No users found')}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {isHindi ? 'नया उपयोगकर्ता जोड़ने के लिए ऊपर दिए गए बटन का उपयोग करें।' : 'Click "+ Add User" above to invite members or staff to your business.'}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Cards (Screens < 768px) */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((u) => {
              const isRevealed = !!revealedPasswords[u.id];
              const isCopied = copiedId === u.id;

              return (
                <div key={u.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                        {(u.full_name || u.email || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{u.full_name || 'No Name'}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider",
                        u.role === 'owner' ? "bg-purple-100 text-purple-700" :
                        u.role === 'admin' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {u.role}
                      </span>
                    </div>
                  </div>

                  {/* Password row */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                      {isHindi ? 'पासवर्ड:' : 'Password:'}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-gray-800">
                        {u.assigned_password
                          ? (isRevealed ? u.assigned_password : '••••••••')
                          : <span className="text-gray-400 italic font-sans">{isHindi ? 'अप्रत्यक्ष / डिफ़ॉल्ट' : 'Encrypted'}</span>
                        }
                      </span>

                      {u.assigned_password && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePasswordReveal(u.id)}
                            className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded"
                            title={isRevealed ? "Hide Password" : "Show Password"}
                          >
                            {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(u.id, u.assigned_password!)}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded"
                            title="Copy Password"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      disabled={actionLoading}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                        u.status === 'active'
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", u.status === 'active' ? "bg-green-500" : "bg-red-500")} />
                      <span>{u.status === 'active' ? (isHindi ? 'सक्रिय (Active)' : 'Active') : (isHindi ? 'निष्क्रिय (Inactive)' : 'Inactive')}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPasswordModal(u)}
                        className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50"
                        title="Change Password"
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1" />
                        {isHindi ? 'पासवर्ड' : 'Password'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(u)}
                        className="h-8 px-2 text-xs text-gray-700 hover:bg-gray-100"
                        title="Edit User"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(u)}
                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50"
                        title="Delete User"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (Screens >= 768px) */}
          <Card className="hidden md:block overflow-hidden border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="min-w-[220px]">{isHindi ? 'उपयोगकर्ता' : 'User'}</TableHead>
                    <TableHead className="w-28">{isHindi ? 'रोल' : 'Role'}</TableHead>
                    <TableHead className="w-32">{isHindi ? 'स्थिति' : 'Status'}</TableHead>
                    <TableHead className="min-w-[180px]">{isHindi ? 'असाइन्ड / पुराना पासवर्ड' : 'Assigned Password'}</TableHead>
                    <TableHead className="w-40 text-right">{isHindi ? 'कार्रवाई' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isRevealed = !!revealedPasswords[u.id];
                    const isCopied = copiedId === u.id;

                    return (
                      <TableRow key={u.id} className="hover:bg-gray-50/80">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {(u.full_name || u.email || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{u.full_name || 'No Name'}</p>
                              <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                            u.role === 'owner' ? "bg-purple-100 text-purple-700 border border-purple-200" :
                            u.role === 'admin' ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-700 border border-gray-200"
                          )}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={actionLoading}
                            title="Click to toggle Active/Inactive"
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border cursor-pointer hover:shadow-xs",
                              u.status === 'active'
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            )}
                          >
                            <span className={cn("h-2 w-2 rounded-full", u.status === 'active' ? "bg-green-500" : "bg-red-500")} />
                            <span>{u.status === 'active' ? (isHindi ? 'सक्रिय' : 'Active') : (isHindi ? 'निष्क्रिय' : 'Inactive')}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200 min-w-[90px] text-center">
                              {u.assigned_password
                                ? (isRevealed ? u.assigned_password : '••••••••')
                                : <span className="text-gray-400 italic font-sans text-xs">{isHindi ? 'अप्रत्यक्ष' : 'Encrypted'}</span>
                              }
                            </span>

                            {u.assigned_password && (
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => togglePasswordReveal(u.id)}
                                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                                  title={isRevealed ? (isHindi ? "पासवर्ड छिपाएं" : "Hide Password") : (isHindi ? "पासवर्ड देखें" : "View Password")}
                                >
                                  {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(u.id, u.assigned_password!)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title={isHindi ? "पासवर्ड कॉपी करें" : "Copy Password"}
                                >
                                  {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPasswordModal(u)}
                              className="h-8 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                              title="Reset Password"
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" />
                              {isHindi ? 'पासवर्ड' : 'Password'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(u)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              title="Edit User"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(u)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <span>{isHindi ? 'नया उपयोगकर्ता जोड़ें' : 'Add New User'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                  {isHindi ? 'पूरा नाम' : 'Full Name'}
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={addForm.full_name}
                  onChange={e => setAddForm(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                  {isHindi ? 'ईमेल *' : 'Email Address *'}
                </Label>
                <Input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={addForm.email}
                  onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                  {isHindi ? 'पासवर्ड (कम से कम 6 अक्षर) *' : 'Password (min 6 chars) *'}
                </Label>
                <div className="relative">
                  <Input
                    type={showAddPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={addForm.password}
                    onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                    {isHindi ? 'रोल' : 'Role'}
                  </Label>
                  <Select
                    value={addForm.role}
                    onValueChange={(val: any) => setAddForm(prev => ({ ...prev, role: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                    {isHindi ? 'स्थिति' : 'Status'}
                  </Label>
                  <Select
                    value={addForm.status}
                    onValueChange={(val: any) => setAddForm(prev => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{isHindi ? 'सक्रिय (Active)' : 'Active'}</SelectItem>
                      <SelectItem value="inactive">{isHindi ? 'निष्क्रिय (Inactive)' : 'Inactive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionLoading}
                  className="border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-semibold shadow-xs"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  <span>{isHindi ? 'उपयोगकर्ता बनाएं' : 'Create User'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                <span>{isHindi ? 'उपयोगकर्ता विवरण बदलें' : 'Edit User Details'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">Email</Label>
                <Input type="email" disabled value={selectedUser.email} className="bg-slate-100 text-slate-700 font-medium border-slate-300" />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                  {isHindi ? 'पूरा नाम' : 'Full Name'}
                </Label>
                <Input
                  type="text"
                  value={editForm.full_name}
                  onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="text-slate-900 font-semibold border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                    {isHindi ? 'रोल' : 'Role'}
                  </Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(val: any) => setEditForm(prev => ({ ...prev, role: val }))}
                  >
                    <SelectTrigger className="font-semibold text-slate-900 border-slate-300">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                    {isHindi ? 'स्थिति' : 'Status'}
                  </Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val: any) => setEditForm(prev => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger className="font-semibold text-slate-900 border-slate-300">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{isHindi ? 'सक्रिय (Active)' : 'Active'}</SelectItem>
                      <SelectItem value="inactive">{isHindi ? 'निष्क्रिय (Inactive)' : 'Inactive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={actionLoading}
                  className="border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-semibold shadow-xs"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  <span>{isHindi ? 'सहेजें' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Password */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <span>{isHindi ? 'पासवर्ड बदलें' : 'Change Password'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">{isHindi ? 'उपयोगकर्ता:' : 'For user:'}</p>
                <p className="font-semibold text-gray-900">{selectedUser.full_name || selectedUser.email}</p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>

              {selectedUser.assigned_password && (
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                  <span className="text-gray-500 font-medium block mb-1">
                    {isHindi ? 'वर्तमान / पुराना असाइन्ड पासवर्ड:' : 'Current / Old assigned password:'}
                  </span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300">
                    {selectedUser.assigned_password}
                  </span>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                  {isHindi ? 'नया पासवर्ड (कम से कम 6 अक्षर) *' : 'New Password (min 6 chars) *'}
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ newPassword: e.target.value })}
                    className="pr-10 text-slate-900 font-medium border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={actionLoading}
                  className="border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-semibold shadow-xs"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  <span>{isHindi ? 'पासवर्ड अपडेट करें' : 'Update Password'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">{isHindi ? 'उपयोगकर्ता हटाएं?' : 'Delete User?'}</h3>
            </div>

            <p className="text-sm text-gray-600">
              {isHindi
                ? `क्या आप वाकई "${selectedUser.full_name || selectedUser.email}" को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।`
                : `Are you sure you want to permanently delete user "${selectedUser.full_name || selectedUser.email}"? This action cannot be undone.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-semibold shadow-xs"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                <span>{isHindi ? 'हां, हटाएं' : 'Delete'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
