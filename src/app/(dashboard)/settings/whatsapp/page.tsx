'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Save, TestTube, Send, Bell, MessageSquare, Zap, Shield, Globe, Edit, X, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WhatsAppConfig {
  id: string;
  business_id: string;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  webhook_verify_token: string;
  webhook_url: string;
  is_active: boolean;
  default_template_namespace: string;
  created_at: string;
  updated_at: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: 'marketing' | 'utility' | 'authentication';
  status: 'pending' | 'approved' | 'rejected';
  components: TemplateComponent[];
  created_at: string;
  updated_at: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
}

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  payload?: string;
}

const mockConfig: WhatsAppConfig = {
  id: '1',
  business_id: '1',
  phone_number_id: '',
  business_account_id: '',
  access_token: '',
  webhook_verify_token: '',
  webhook_url: '',
  is_active: false,
  default_template_namespace: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTemplates: WhatsAppTemplate[] = [
  {
    id: '1',
    name: 'payment_receipt',
    language: 'en',
    category: 'utility',
    status: 'approved',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Payment Receipt' },
      { type: 'BODY', text: 'Dear {{1}},\n\nThank you for your payment of {{2}} received on {{3}}.\n\nReceipt No: {{4}}\nPayment Method: {{5}}\n\nWe appreciate your business!\n\nRegards,\n{{6}}' },
      { type: 'FOOTER', text: 'Powered by Hisab Kitab' },
      { type: 'BUTTONS', buttons: [
        { type: 'QUICK_REPLY', text: 'View Statement', payload: 'VIEW_STATEMENT' },
        { type: 'URL', text: 'Download PDF', url: 'https://hisabkitab.com/receipt/{{4}}' },
      ]},
    ],
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
  {
    id: '2',
    name: 'outstanding_reminder',
    language: 'en',
    category: 'utility',
    status: 'approved',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Payment Reminder' },
      { type: 'BODY', text: 'Dear {{1}},\n\nThis is a gentle reminder that you have an outstanding balance of {{2}}.\n\nPlease make the payment at your earliest convenience.\n\nRegards,\n{{3}}' },
      { type: 'FOOTER', text: 'Powered by Hisab Kitab' },
      { type: 'BUTTONS', buttons: [
        { type: 'QUICK_REPLY', text: 'Pay Now', payload: 'PAY_NOW' },
        { type: 'QUICK_REPLY', text: 'View Details', payload: 'VIEW_DETAILS' },
      ]},
    ],
    created_at: '2024-01-12T10:00:00Z',
    updated_at: '2024-01-12T10:00:00Z',
  },
  {
    id: '3',
    name: 'welcome_message',
    language: 'en',
    category: 'marketing',
    status: 'pending',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Welcome to {{1}}!' },
      { type: 'BODY', text: 'Hi {{2}},\n\nWelcome to {{1}}! We are excited to have you on board.\n\nYour account has been set up successfully. You can now manage your ledger, track payments, and generate reports.\n\nGet started: {{3}}\n\nBest regards,\nThe {{1}} Team' },
      { type: 'FOOTER', text: 'Powered by Hisab Kitab' },
      { type: 'BUTTONS', buttons: [
        { type: 'URL', text: 'Get Started', url: '{{3}}' },
      ]},
    ],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
];

const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'pa', name: 'Punjabi' },
];

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'messages' | 'logs'>('config');
  const [config, setConfig] = useState<WhatsAppConfig>(mockConfig);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(mockTemplates);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Config form state
  const [formData, setFormData] = useState({
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    webhook_verify_token: '',
    default_template_namespace: '',
    is_active: false,
  });

  // Template form state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    language: 'en',
    category: 'utility' as 'marketing' | 'utility' | 'authentication',
    header_text: '',
    header_format: 'TEXT' as 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT',
    body_text: '',
    footer_text: '',
    buttons: [] as TemplateButton[],
  });

  // Test message state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({
    phone_number: '',
    template_name: '',
    language: 'en',
    parameters: [] as string[],
  });

  useEffect(() => {
    // In real app, fetch from API
    setFormData({
      phone_number_id: config.phone_number_id,
      business_account_id: config.business_account_id,
      access_token: config.access_token,
      webhook_verify_token: config.webhook_verify_token,
      default_template_namespace: config.default_template_namespace,
      is_active: config.is_active,
    });
  }, [config]);

  const handleConfigChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // In real app: await fetch('/api/whatsapp/config', { method: 'PUT', body: JSON.stringify(formData) });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('WhatsApp configuration saved successfully!');
      setConfig(prev => ({ ...prev, ...formData }));
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setError(null);

    try {
      // In real app: call Meta Graph API to verify credentials
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess('Connection test successful! Your WhatsApp Business API is configured correctly.');
    } catch (err) {
      setError('Connection test failed. Please check your credentials.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleOpenTemplateModal = (template?: WhatsAppTemplate) => {
    if (template) {
      setEditingTemplate(template);
      const headerComp = template.components.find(c => c.type === 'HEADER');
      const bodyComp = template.components.find(c => c.type === 'BODY');
      const footerComp = template.components.find(c => c.type === 'FOOTER');
      const buttonsComp = template.components.find(c => c.type === 'BUTTONS');

      setTemplateForm({
        name: template.name,
        language: template.language,
        category: template.category,
        header_text: headerComp?.text || '',
        header_format: headerComp?.format || 'TEXT',
        body_text: bodyComp?.text || '',
        footer_text: footerComp?.text || '',
        buttons: buttonsComp?.buttons || [],
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        language: 'en',
        category: 'utility',
        header_text: '',
        header_format: 'TEXT',
        body_text: '',
        footer_text: '',
        buttons: [],
      });
    }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      // In real app: call Meta Graph API to create/update template
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
      setShowTemplateModal(false);
      setEditingTemplate(null);
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTestModal = (templateName?: string) => {
    setTestForm(prev => ({
      ...prev,
      template_name: templateName || '',
    }));
    setShowTestModal(true);
  };

  const handleSendTestMessage = async () => {
    setSaving(true);
    try {
      // In real app: call /api/whatsapp/send
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess('Test message sent successfully!');
      setShowTestModal(false);
    } catch (err) {
      setError('Failed to send test message');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'marketing': return <Zap className="h-4 w-4" />;
      case 'utility': return <Bell className="h-4 w-4" />;
      case 'authentication': return <Shield className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Integration</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Integration</h1>
          <p className="text-gray-500">Configure WhatsApp Business API for customer communications</p>
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
          <TabsTrigger value="config">
            <Globe className="mr-2 h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="messages">
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </TabsTrigger>
          <TabsTrigger value="logs">
            <TestTube className="mr-2 h-4 w-4" />
            Delivery Logs
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                WhatsApp Business API Configuration
              </CardTitle>
              <CardDescription>
                Enter your Meta WhatsApp Business Cloud API credentials.
                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  Get credentials
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Required Credentials</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_number_id">Phone Number ID <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone_number_id"
                      placeholder="e.g., 123456789012345"
                      value={formData.phone_number_id}
                      onChange={e => handleConfigChange('phone_number_id', e.target.value)}
                    />
                    <p className="text-sm text-gray-500">Found in WhatsApp Business Account {" > "} API Setup</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_account_id">Business Account ID <span className="text-red-500">*</span></Label>
                    <Input
                      id="business_account_id"
                      placeholder="e.g., 123456789012345"
                      value={formData.business_account_id}
                      onChange={e => handleConfigChange('business_account_id', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="access_token">Access Token <span className="text-red-500">*</span></Label>
                    <Input
                      id="access_token"
                      type="password"
                      placeholder="EAAG... (Permanent token recommended)"
                      value={formData.access_token}
                      onChange={e => handleConfigChange('access_token', e.target.value)}
                    />
                    <p className="text-sm text-gray-500">Generate a permanent token in Meta Developer Dashboard {" > "} WhatsApp {" > "} API Setup</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h4 className="font-semibold text-gray-900">Webhook Configuration</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook_verify_token">Webhook Verify Token <span className="text-red-500">*</span></Label>
                    <Input
                      id="webhook_verify_token"
                      placeholder="Your secret verify token"
                      value={formData.webhook_verify_token}
                      onChange={e => handleConfigChange('webhook_verify_token', e.target.value)}
                    />
                    <p className="text-sm text-gray-500">Set this same token in Meta Developer Dashboard {" > "} WhatsApp {" > "} Configuration {" > "} Webhook</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={`${window.location.origin}/api/webhooks/whatsapp`}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500">Configure this URL in Meta Developer Dashboard. Must be HTTPS.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h4 className="font-semibold text-gray-900">Advanced Settings</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_template_namespace">Default Template Namespace</Label>
                    <Input
                      id="default_template_namespace"
                      placeholder="e.g., your_business_namespace"
                      value={formData.default_template_namespace}
                      onChange={e => handleConfigChange('default_template_namespace', e.target.value)}
                    />
                    <p className="text-sm text-gray-500">Optional: Your WhatsApp template namespace</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Enable WhatsApp Integration</Label>
                      <p className="text-sm text-gray-500">Activate WhatsApp messaging for this business</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={checked => handleConfigChange('is_active', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-4">
              <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection || saving}>
                {testingConnection ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common WhatsApp integration tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-auto py-4 flex-col items-start gap-2" onClick={() => setActiveTab('templates')}>
                  <MessageSquare className="h-6 w-6" />
                  <span className="font-medium">Manage Templates</span>
                  <span className="text-sm text-gray-500">Create and edit message templates</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col items-start gap-2" onClick={() => setActiveTab('messages')}>
                  <Send className="h-6 w-6" />
                  <span className="font-medium">Send Test Message</span>
                  <span className="text-sm text-gray-500">Test your configuration</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col items-start gap-2" onClick={() => setActiveTab('logs')}>
                  <TestTube className="h-6 w-6" />
                  <span className="font-medium">View Delivery Logs</span>
                  <span className="text-sm text-gray-500">Monitor message delivery status</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Message Templates</h2>
              <p className="text-gray-500">Manage WhatsApp message templates for different use cases</p>
            </div>
            <Button onClick={() => handleOpenTemplateModal()}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Template</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {template.components.find(c => c.type === 'BODY')?.text?.substring(0, 60)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {availableLanguages.find(l => l.code === template.language)?.name || template.language}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(template.category)}
                          <span className="capitalize">{template.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(template.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(template.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenTestModal(template.name)} title="Send test">
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenTemplateModal(template)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Message Tab */}
        <TabsContent value="messages" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send WhatsApp Message
              </CardTitle>
              <CardDescription>Send a template message to a customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="send_phone">Phone Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="send_phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={testForm.phone_number}
                    onChange={e => setTestForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  />
                  <p className="text-sm text-gray-500">Enter phone number with country code (e.g., +91 for India)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="send_template">Template <span className="text-red-500">*</span></Label>
                  <Select
                    value={testForm.template_name}
                    onValueChange={value => setTestForm(prev => ({ ...prev, template_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.status === 'approved').map(template => (
                        <SelectItem key={template.id} value={template.name}>
                          {template.name} ({template.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="send_language">Language</Label>
                  <Select
                    value={testForm.language}
                    onValueChange={value => setTestForm(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label className="font-medium">Template Parameters</Label>
                  <p className="text-sm text-gray-500">Enter values for template variables ({"{{"}1, {"{{"}2, etc.) in order</p>
                  <div className="space-y-2" id="parameters-container">
                    {Array.from({ length: 5 }, (_, i) => {
                      const paramNum = i + 1;
                      return (
                        <Input
                          key={i}
                          placeholder={`Parameter {${paramNum}} (optional)`}
                          value={testForm.parameters[i] || ''}
                          onChange={e => {
                            const params = [...testForm.parameters];
                            params[i] = e.target.value;
                            setTestForm(prev => ({ ...prev, parameters: params }));
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setTestForm({ phone_number: '', template_name: '', language: 'en', parameters: [] })}>
                  Clear Form
                </Button>
                <Button onClick={handleSendTestMessage} disabled={saving || !testForm.phone_number || !testForm.template_name}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Template Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
              <CardDescription>Preview of the selected template</CardDescription>
            </CardHeader>
            <CardContent>
              {testForm.template_name && templates.find(t => t.name === testForm.template_name) ? (
                (() => {
                  const template = templates.find(t => t.name === testForm.template_name)!;
                  const filledBody = template.components.find(c => c.type === 'BODY')?.text
                    ?.replace(/\{\{(\d+)\}\}/g, (match, num) => testForm.parameters[parseInt(num) - 1] || match) || '';

                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(template.category)}
                        <span className="font-medium text-green-800">{template.name}</span>
                        <Badge variant="success">{template.status}</Badge>
                      </div>
                      {template.components.find(c => c.type === 'HEADER')?.text && (
                        <div className="bg-green-100 p-2 rounded mb-2 font-semibold text-green-900">
                          {template.components.find(c => c.type === 'HEADER')?.text}
                        </div>
                      )}
                      <div className="text-green-900 whitespace-pre-wrap text-sm mb-2">{filledBody}</div>
                      {template.components.find(c => c.type === 'FOOTER')?.text && (
                        <div className="text-xs text-green-600 border-t border-green-200 pt-2">
                          {template.components.find(c => c.type === 'FOOTER')?.text}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-gray-500 text-center py-8">Select a template to preview</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Logs Tab */}
        <TabsContent value="logs" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Delivery Logs
              </CardTitle>
              <CardDescription>Monitor WhatsApp message delivery status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Template</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Message ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { date: '2024-01-15 10:30:00', template: 'payment_receipt', recipient: '+91 98765 43210', status: 'delivered', messageId: 'wamid.HBgM...', error: '' },
                    { date: '2024-01-15 09:15:00', template: 'outstanding_reminder', recipient: '+91 98765 43211', status: 'read', messageId: 'wamid.HBgM...', error: '' },
                    { date: '2024-01-14 16:45:00', template: 'payment_receipt', recipient: '+91 98765 43212', status: 'sent', messageId: 'wamid.HBgM...', error: '' },
                    { date: '2024-01-14 14:20:00', template: 'welcome_message', recipient: '+91 98765 43213', status: 'failed', messageId: 'wamid.HBgM...', error: 'Template not approved' },
                  ].map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{log.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{log.template}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{log.recipient}</td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          log.status === 'delivered' || log.status === 'read' ? 'success' :
                          log.status === 'sent' ? 'default' :
                          'destructive'
                        }>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.messageId}</td>
                      <td className="px-6 py-4 text-sm text-red-600">{log.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTemplateModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tmpl_name">Template Name <span className="text-red-500">*</span></Label>
                <Input
                  id="tmpl_name"
                  placeholder="snake_case_name (e.g., payment_receipt)"
                  value={templateForm.name}
                  onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-sm text-gray-500">Lowercase with underscores only. Must be unique.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tmpl_language">Language</Label>
                  <Select
                    value={templateForm.language}
                    onValueChange={value => setTemplateForm(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tmpl_category">Category</Label>
                  <Select
                    value={templateForm.category}
                    onValueChange={value => setTemplateForm(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utility">Utility</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tmpl_header_format">Header Format</Label>
                  <Select
                    value={templateForm.header_format}
                    onValueChange={value => setTemplateForm(prev => ({ ...prev, header_format: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                      <SelectItem value="DOCUMENT">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tmpl_header">Header Text (if TEXT format)</Label>
                <Input
                  id="tmpl_header"
                  placeholder="Optional header text with variables like {{1}}"
                  value={templateForm.header_text}
                  onChange={e => setTemplateForm(prev => ({ ...prev, header_text: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tmpl_body">Body Text <span className="text-red-500">*</span></Label>
                <Textarea
                  id="tmpl_body"
                  placeholder="Main message content. Use {{1}}, {{2}} for variables..."
                  rows={6}
                  value={templateForm.body_text}
                  onChange={e => setTemplateForm(prev => ({ ...prev, body_text: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tmpl_footer">Footer Text</Label>
                <Input
                  id="tmpl_footer"
                  placeholder="Optional footer text"
                  value={templateForm.footer_text}
                  onChange={e => setTemplateForm(prev => ({ ...prev, footer_text: e.target.value }))}
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label className="font-medium">Buttons (Max 3)</Label>
                <div className="space-y-2">
                  {templateForm.buttons.map((btn, i) => (
                    <div key={i} className="flex gap-2">
                      <Select
                        value={btn.type}
                        onValueChange={value => {
                          const btns = [...templateForm.buttons];
                          btns[i] = { ...btns[i], type: value as any };
                          setTemplateForm(prev => ({ ...prev, buttons: btns }));
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                          <SelectItem value="URL">URL Button</SelectItem>
                          <SelectItem value="PHONE_NUMBER">Phone Button</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Button text"
                        value={btn.text}
                        onChange={e => {
                          const btns = [...templateForm.buttons];
                          btns[i] = { ...btns[i], text: e.target.value };
                          setTemplateForm(prev => ({ ...prev, buttons: btns }));
                        }}
                        className="flex-1"
                      />
                      {btn.type === 'URL' && (
                        <Input
                          placeholder="URL with {{1}} variables"
                          value={btn.url || ''}
                          onChange={e => {
                            const btns = [...templateForm.buttons];
                            btns[i] = { ...btns[i], url: e.target.value };
                            setTemplateForm(prev => ({ ...prev, buttons: btns }));
                          }}
                          className="w-[200px]"
                        />
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <Input
                          placeholder="Phone number"
                          value={btn.phone_number || ''}
                          onChange={e => {
                            const btns = [...templateForm.buttons];
                            btns[i] = { ...btns[i], phone_number: e.target.value };
                            setTemplateForm(prev => ({ ...prev, buttons: btns }));
                          }}
                          className="w-[200px]"
                        />
                      )}
                      {btn.type === 'QUICK_REPLY' && (
                        <Input
                          placeholder="Payload"
                          value={btn.payload || ''}
                          onChange={e => {
                            const btns = [...templateForm.buttons];
                            btns[i] = { ...btns[i], payload: e.target.value };
                            setTemplateForm(prev => ({ ...prev, buttons: btns }));
                          }}
                          className="w-[200px]"
                        />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => {
                        const btns = templateForm.buttons.filter((_, idx) => idx !== i);
                        setTemplateForm(prev => ({ ...prev, buttons: btns }));
                      }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {templateForm.buttons.length < 3 && (
                    <Button variant="outline" size="sm" onClick={() => setTemplateForm(prev => ({
                      ...prev,
                      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }]
                    }))}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Button
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
              <Button onClick={handleSaveTemplate} disabled={saving}>
                {saving ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}