'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle, Save, Building2, Globe, CreditCard, Bell, Shield, Smartphone, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation, Language } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';

interface Business {
  id: string;
  name: string;
  logo_url: string;
  mobile_number: string;
  whatsapp_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  gstin: string;
  business_type: string;
  currency: string;
  default_language: string;
  financial_year_start: string;
}

interface BusinessSettings {
  default_currency: string;
  default_language: string;
  financial_year_start: string;
  receipt_number_format: string;
  invoice_number_format: string;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
}

const mockBusiness: Business = {
  id: '1',
  name: 'Hisab Kitab Demo',
  logo_url: '',
  mobile_number: '9876543210',
  whatsapp_number: '9876543210',
  email: 'demo@hisabkitab.com',
  address: '123 Business Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  pin_code: '400001',
  gstin: '27ABCDE1234F1Z5',
  business_type: 'Retail',
  currency: 'INR',
  default_language: 'en',
  financial_year_start: '2024-04-01',
};

const mockSettings: BusinessSettings = {
  default_currency: 'INR',
  default_language: 'en',
  financial_year_start: '2024-04-01',
  receipt_number_format: 'RCP-{YYYY}-{SEQ}',
  invoice_number_format: 'INV-{YYYY}-{SEQ}',
  whatsapp_enabled: false,
  email_enabled: false,
};

const currencies = [
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
];

const languages = [
  { code: 'en', name: 'English (अंग्रेज़ी)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
];

const businessTypes = [
  'Retail',
  'Wholesale',
  'Manufacturing',
  'Services',
  'Trading',
  'Other',
];

const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

// Helper function to preview a format template
function previewFormat(format: string, seq = 1): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const yy = String(year).slice(-2);
  return format
    .replace('{YYYY}', String(year))
    .replace('{YY}', yy)
    .replace('{MM}', month)
    .replace('{DD}', day)
    .replace('{SEQ5}', String(seq).padStart(5, '0'))
    .replace('{SEQ4}', String(seq).padStart(4, '0'))
    .replace('{SEQ3}', String(seq).padStart(3, '0'))
    .replace('{SEQ}', String(seq).padStart(3, '0'));
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'whatsapp' | 'notifications' | 'advanced'>('general');
  const [business, setBusiness] = useState<Business>(mockBusiness);
  const [settings, setSettings] = useState<BusinessSettings>({
    ...mockSettings,
    default_language: language,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // Load real settings from DB on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const [bizRes, settingsRes] = await Promise.all([
          fetch('/api/business', { headers }),
          fetch('/api/settings', { headers }),
        ]);
        if (bizRes.ok) {
          const bizData = await bizRes.json();
          if (bizData.business) setBusiness(bizData.business);
        }
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            setSettings(prev => ({ ...prev, ...settingsData.settings }));
          }
        }
      } catch (err) {
        console.warn('Failed to load settings, using defaults', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleBusinessChange = (field: string, value: any) => {
    setBusiness(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/business', {
        method: 'PUT',
        headers,
        body: JSON.stringify(business),
      });
      if (!response.ok) throw new Error('Failed to save business info');
      setSuccess('Business information saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === 'hi' ? 'व्यापार सेटिंग्स (Settings)' : 'Settings'}
          </h1>
          <p className="text-gray-500">
            {language === 'hi' ? 'अपनी व्यापार सेटिंग्स, भाषा और प्राथमिकताएं प्रबंधित करें' : 'Manage your business settings and preferences'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <Link href="/dashboard/settings/categories">
              <Layers className="mr-2 h-4 w-4" />
              {language === 'hi' ? 'सामग्री श्रेणियाँ' : 'Material Categories'}
            </Link>
          </Button>
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link href="/dashboard/settings/whatsapp">
              <Smartphone className="mr-2 h-4 w-4" />
              WhatsApp
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Building2 className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <Smartphone className="mr-2 h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Shield className="mr-2 h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Basic information about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="business_name"
                    value={business.name}
                    onChange={e => handleBusinessChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={business.business_type}
                    onValueChange={value => handleBusinessChange('business_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile_number">Mobile Number</Label>
                  <Input
                    id="mobile_number"
                    type="tel"
                    placeholder="9876543210"
                    value={business.mobile_number}
                    onChange={e => handleBusinessChange('mobile_number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                  <Input
                    id="whatsapp_number"
                    type="tel"
                    placeholder="9876543210"
                    value={business.whatsapp_number}
                    onChange={e => handleBusinessChange('whatsapp_number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="business@example.com"
                    value={business.email}
                    onChange={e => handleBusinessChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    placeholder="27ABCDE1234F1Z5"
                    value={business.gstin}
                    onChange={e => handleBusinessChange('gstin', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <Label className="font-medium">Address</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address Line 1</Label>
                    <Input
                      id="address"
                      placeholder="123 Business Street"
                      value={business.address}
                      onChange={e => handleBusinessChange('address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      value={business.city}
                      onChange={e => handleBusinessChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={business.state}
                      onValueChange={value => handleBusinessChange('state', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin_code">PIN Code</Label>
                    <Input
                      id="pin_code"
                      placeholder="400001"
                      value={business.pin_code}
                      onChange={e => handleBusinessChange('pin_code', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveGeneral} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Business Info
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Localization & Currency
              </CardTitle>
              <CardDescription>Default currency, language, and financial year settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="default_currency">Default Currency</Label>
                  <Select
                    value={settings.default_currency}
                    onValueChange={value => handleSettingsChange('default_currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(curr => (
                        <SelectItem key={curr.code} value={curr.code}>{curr.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_language" className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-blue-600" />
                    {language === 'hi' ? 'ऐप की भाषा (Application Language)' : 'Application Language'}
                  </Label>
                  <Select
                    value={language}
                    onValueChange={(value: Language) => {
                      setLanguage(value);
                      handleSettingsChange('default_language', value);
                      setSuccess(value === 'hi' ? 'भाषा बदलकर हिन्दी कर दी गई है!' : 'Language changed to English!');
                      setTimeout(() => setSuccess(null), 3000);
                    }}
                  >
                    <SelectTrigger className="border-blue-300 bg-blue-50/50 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code} className="font-medium">
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="financial_year_start">Financial Year Start</Label>
                  <Input
                    id="financial_year_start"
                    type="date"
                    value={settings.financial_year_start}
                    onChange={e => handleSettingsChange('financial_year_start', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="receipt_format">Receipt Number Format</Label>
                  <Input
                    id="receipt_format"
                    placeholder="RCP-{YYYY}-{SEQ}"
                    value={settings.receipt_number_format}
                    onChange={e => handleSettingsChange('receipt_number_format', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Tokens: <code className="bg-gray-100 px-1 rounded">{'{YYYY}'}</code> <code className="bg-gray-100 px-1 rounded">{'{YY}'}</code> <code className="bg-gray-100 px-1 rounded">{'{MM}'}</code> <code className="bg-gray-100 px-1 rounded">{'{DD}'}</code> <code className="bg-gray-100 px-1 rounded">{'{SEQ}'}</code> <code className="bg-gray-100 px-1 rounded">{'{SEQ4}'}</code>
                  </p>
                  {settings.receipt_number_format && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <span className="text-blue-600 font-medium">Preview:</span>
                      <code className="text-blue-800 font-mono">{previewFormat(settings.receipt_number_format, 1)}</code>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_format">Invoice Number Format</Label>
                  <Input
                    id="invoice_format"
                    placeholder="INV-{YYYY}-{SEQ}"
                    value={settings.invoice_number_format}
                    onChange={e => handleSettingsChange('invoice_number_format', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Tokens: <code className="bg-gray-100 px-1 rounded">{'{YYYY}'}</code> <code className="bg-gray-100 px-1 rounded">{'{YY}'}</code> <code className="bg-gray-100 px-1 rounded">{'{MM}'}</code> <code className="bg-gray-100 px-1 rounded">{'{DD}'}</code> <code className="bg-gray-100 px-1 rounded">{'{SEQ}'}</code> <code className="bg-gray-100 px-1 rounded">{'{SEQ4}'}</code>
                  </p>
                  {settings.invoice_number_format && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                      <span className="text-green-600 font-medium">Preview:</span>
                      <code className="text-green-800 font-mono">{previewFormat(settings.invoice_number_format, 1)}</code>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Localization
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                WhatsApp Integration
              </CardTitle>
              <CardDescription>
                Configure WhatsApp Business API for automated customer communications.
                <Link href="/dashboard/settings/whatsapp" className="text-blue-600 underline ml-2">
                  Open full configuration
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">WhatsApp Messaging</h4>
                  <p className="text-sm text-gray-500">Enable automated WhatsApp messages for receipts, reminders, and statements</p>
                </div>
                <Switch
                  checked={settings.whatsapp_enabled}
                  onCheckedChange={checked => handleSettingsChange('whatsapp_enabled', checked)}
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Full WhatsApp configuration (API credentials, templates, webhooks) is available in the
                  <Link href="/dashboard/settings/whatsapp" className="underline">WhatsApp Integration page</Link>.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" asChild className="h-auto py-4 flex-col items-start gap-2">
                  <Link href="/dashboard/settings/whatsapp">
                    <CreditCard className="h-6 w-6" />
                    <span className="font-medium">Configure API</span>
                    <span className="text-sm text-gray-500">Set up Meta Cloud API credentials</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto py-4 flex-col items-start gap-2">
                  <Link href="/dashboard/settings/whatsapp?tab=templates">
                    <FileText className="h-6 w-6" />
                    <span className="font-medium">Manage Templates</span>
                    <span className="text-sm text-gray-500">Create message templates</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto py-4 flex-col items-start gap-2">
                  <Link href="/dashboard/settings/whatsapp?tab=logs">
                    <Bell className="h-6 w-6" />
                    <span className="font-medium">Delivery Logs</span>
                    <span className="text-sm text-gray-500">View message status</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Email Notifications</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email alerts for important events</p>
                  </div>
                  <Switch
                    checked={settings.email_enabled}
                    onCheckedChange={checked => handleSettingsChange('email_enabled', checked)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">Daily outstanding summary</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">Payment receipt confirmations</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">Weekly business reports</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">System maintenance alerts</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h4 className="font-semibold text-gray-900">WhatsApp Notifications</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">Payment receipt to customers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">Outstanding payment reminders</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">Statement notifications</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm">Welcome messages for new customers</span>
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notifications
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="mt-6 space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Shield className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions - proceed with caution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Delete Business Data</h4>
                <p className="text-sm text-red-700 mb-4">
                  This will permanently delete all customers, transactions, products, and settings for this business.
                  This action cannot be undone.
                </p>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Delete All Data
                </Button>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Export All Data</h4>
                <p className="text-sm text-yellow-700 mb-4">
                  Download a complete backup of your business data in JSON format.
                </p>
                <Button variant="outline" className="w-full sm:w-auto">
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                API & Integrations
              </CardTitle>
              <CardDescription>Manage API access for third-party integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">API access coming soon. Contact support for early access.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}