import React, { useEffect, useState, useRef } from 'react';
import { 
  Mail, 
  Server, 
  Lock, 
  User, 
  Send,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
  History,
  Plus,
  Trash2,
  Pen,
  Image,
  Upload,
  FileImage,
  Check,
  X,
  ZoomIn,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { TEMPLATE_NAMES, TEMPLATE_DESCRIPTIONS, TEMPLATES, type PdfDisplaySettings, type CompanyInfo } from '@/components/QuotePdfTemplates';
import type { QuotePdfData } from '@/components/QuotePdfTemplates';

interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: string;
  smtp_from_email: string;
  smtp_from_name: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  admin_email: string;
  cc_emails: string;
  send_admin_notifications: string;
  send_customer_confirmations: string;
}

type TemplateType = 'quote' | 'notification' | 'password_reset' | 'contact' | 'status_change' | 'other';

interface EmailTemplate {
  id: number;
  template_key: string;
  template_type: TemplateType;
  name: string;
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_active: boolean;
}

const templateTypeLabels: Record<TemplateType, string> = {
  quote: 'Devis',
  notification: 'Notification',
  password_reset: 'Mot de passe',
  contact: 'Contact',
  status_change: 'Changement de statut',
  other: 'Autre',
};

const templateTypeColors: Record<TemplateType, string> = {
  quote: 'bg-blue-100 text-blue-800',
  notification: 'bg-purple-100 text-purple-800',
  password_reset: 'bg-yellow-100 text-yellow-800',
  contact: 'bg-green-100 text-green-800',
  status_change: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  template_key: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string;
  created_at: string;
}

interface EmailSignature {
  id: number;
  signature_key: string;
  name: string;
  description: string;
  body_html: string;
  logo_url: string;
  photo_url: string;
  is_active: boolean;
  is_default: boolean;
}

const defaultSettings: EmailSettings = {
  smtp_host: 'mail.sunbox-mauritius.com',
  smtp_port: '465',
  smtp_user: 'email@sunbox-mauritius.com',
  smtp_password: '~Access1976~',
  smtp_secure: 'tls',
  smtp_from_email: 'info@sunbox-mauritius.com',
  smtp_from_name: 'Sunbox Ltd',
  company_name: 'Sunbox Ltd',
  company_email: 'info@sunbox-mauritius.com',
  company_phone: "+230 52544544 / +230 54221025",
  company_address: 'Grand Baie, Mauritius',
  admin_email: 'vmamet@sunbox-mauritius.com',
  cc_emails: '',
  send_admin_notifications: 'true',
  send_customer_confirmations: 'true',
};

const defaultNewTemplate: Omit<EmailTemplate, 'id'> = {
  template_key: '',
  template_type: 'other',
  name: '',
  description: '',
  subject: '',
  body_html: '',
  body_text: '',
  is_active: true,
};

const defaultNewSignature: Omit<EmailSignature, 'id'> = {
  signature_key: '',
  name: '',
  description: '',
  body_html: '',
  logo_url: '',
  photo_url: '',
  is_active: true,
  is_default: false,
};

interface PdfSettings {
  pdf_primary_color: string;
  pdf_accent_color: string;
  pdf_footer_text: string;
  pdf_terms: string;
  pdf_bank_details: string;
  pdf_validity_days: string;
  pdf_show_logo: string;
  pdf_show_vat: string;
  pdf_show_bank_details: string;
  pdf_show_terms: string;
  pdf_template: string;
  pdf_font: string;
  pdf_logo_position: string;
}

const defaultPdfSettings: PdfSettings = {
  pdf_primary_color: '#1A365D',
  pdf_accent_color: '#f97316',
  pdf_footer_text: 'Sunbox Ltd – Grand Baie, Mauritius | info@sunbox-mauritius.com',
  pdf_terms: 'Ce devis est valable pour la durée indiquée. Les prix sont en MUR et hors TVA sauf mention contraire. Paiement selon conditions convenues.',
  pdf_bank_details: '',
  pdf_validity_days: '30',
  pdf_show_logo: 'true',
  pdf_show_vat: 'true',
  pdf_show_bank_details: 'false',
  pdf_show_terms: 'true',
  pdf_template: '1',
  pdf_font: 'inter',
  pdf_logo_position: 'left',
};

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>(defaultSettings);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<EmailSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('smtp');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateSignatureForm, setShowCreateSignatureForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<EmailTemplate, 'id'>>(defaultNewTemplate);
  const [newSignature, setNewSignature] = useState<Omit<EmailSignature, 'id'>>(defaultNewSignature);
  const [siteLogo, setSiteLogo] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>(defaultPdfSettings);
  const [savingPdf, setSavingPdf] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [previewQuotes, setPreviewQuotes] = useState<any[]>([]);
  const [previewQuoteId, setPreviewQuoteId] = useState<number | null>(null);
  const [previewQuoteData, setPreviewQuoteData] = useState<QuotePdfData | null>(null);
  const [previewQuoteLoading, setPreviewQuoteLoading] = useState(false);
  const newPhotoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  // Load quote list when preview opens
  useEffect(() => {
    if (!previewTemplateId) return;
    api.getQuotes().then((list: any[]) => setPreviewQuotes(list || [])).catch(() => {});
  }, [previewTemplateId]);

  // Load full quote details when a quote is selected in the preview
  useEffect(() => {
    if (!previewQuoteId) { setPreviewQuoteData(null); return; }
    setPreviewQuoteLoading(true);
    api.getQuoteWithDetails(previewQuoteId)
      .then((q: any) => {
        const vatRate = Number(pdfSettings.pdf_show_vat) || 15;
        setPreviewQuoteData({
          id:               q.id,
          reference_number: q.reference_number,
          created_at:       q.created_at,
          valid_until:      q.valid_until,
          status:           q.status,
          customer_name:    q.customer_name,
          customer_email:   q.customer_email,
          customer_phone:   q.customer_phone,
          customer_address: q.customer_address || '',
          model_name:       q.model_name || q.model_display_name,
          model_type:       q.model_type || q.model_display_type,
          quote_title:      q.quote_title,
          photo_url:        q.photo_url || '',
          plan_url:         q.plan_url  || '',
          base_price:       Number(q.base_price),
          options_total:    Number(q.options_total),
          total_price:      Number(q.total_price),
          vat_rate:         vatRate,
          options:          q.options   || [],
          categories:       q.categories || [],
          is_free_quote:    !!q.is_free_quote,
        });
      })
      .catch(() => setPreviewQuoteData(null))
      .finally(() => setPreviewQuoteLoading(false));
  }, [previewQuoteId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load settings
      const settingsResult = await api.getSettings();
      if (settingsResult) {
        setSettings({ ...defaultSettings, ...settingsResult });
      }
      
      // Load site settings to get the logo
      try {
        const siteSettingsResult = await api.getSettings('site');
        if (siteSettingsResult && siteSettingsResult.site_logo) {
          setSiteLogo(siteSettingsResult.site_logo);
        }
      } catch (e) {
        console.log('Site settings not available');
      }
      
      // Load templates
      try {
        const templatesResult = await api.getEmailTemplates();
        if (Array.isArray(templatesResult)) {
          setTemplates(templatesResult);
        }
      } catch (e) {
        console.log('Templates not available');
      }
      
      // Load email logs
      try {
        const logsResult = await api.getEmailLogs(20);
        if (Array.isArray(logsResult)) {
          setEmailLogs(logsResult);
        }
      } catch (e) {
        console.log('Email logs not available');
      }

      // Load signatures
      try {
        const signaturesResult = await api.getEmailSignatures();
        if (Array.isArray(signaturesResult)) {
          setSignatures(signaturesResult);
        }
      } catch (e) {
        console.log('Signatures not available');
      }

      // Load PDF template settings
      try {
        const pdfResult = await api.getSettings('pdf');
        if (pdfResult) {
          setPdfSettings({ ...defaultPdfSettings, ...pdfResult });
        }
      } catch (e) {
        console.log('PDF settings not available');
      }
      
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value || '',
        group: key.startsWith('smtp_') ? 'email' : 
               key.startsWith('company_') ? 'company' : 
               key.startsWith('admin_') || key.startsWith('send_') || key.startsWith('cc_') ? 'notifications' : 'general',
      }));
      
      await api.updateSettingsBulk(settingsArray);
      toast({ title: 'Succès', description: 'Paramètres enregistrés avec succès' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const savePdfSettings = async () => {
    try {
      setSavingPdf(true);
      const settingsArray = Object.entries(pdfSettings).map(([key, value]) => ({
        key,
        value: value ?? '',
        group: 'pdf',
      }));
      await api.updateSettingsBulk(settingsArray);
      toast({ title: 'Succès', description: 'Modèle PDF enregistré avec succès' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPdf(false);
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setSaving(true);
      await api.updateEmailTemplate({
        templateKey: selectedTemplate.template_key,
        templateType: selectedTemplate.template_type,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        subject: selectedTemplate.subject,
        bodyHtml: selectedTemplate.body_html,
        bodyText: selectedTemplate.body_text
      });
      toast({ title: 'Succès', description: 'Template enregistré' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.template_key || !newTemplate.name || !newTemplate.subject || !newTemplate.body_html) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    
    // Validate template_key format (snake_case: lowercase letters, numbers, underscores)
    const templateKeyRegex = /^[a-z][a-z0-9_]*$/;
    if (!templateKeyRegex.test(newTemplate.template_key)) {
      toast({ 
        title: 'Erreur', 
        description: 'La clé du template doit être en snake_case (lettres minuscules, chiffres et underscores)', 
        variant: 'destructive' 
      });
      return;
    }
    
    try {
      setSaving(true);
      await api.createEmailTemplate({
        templateKey: newTemplate.template_key,
        templateType: newTemplate.template_type,
        name: newTemplate.name,
        description: newTemplate.description,
        subject: newTemplate.subject,
        bodyHtml: newTemplate.body_html,
        bodyText: newTemplate.body_text,
        isActive: newTemplate.is_active
      });
      toast({ title: 'Succès', description: 'Template créé avec succès' });
      setShowCreateForm(false);
      setNewTemplate(defaultNewTemplate);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateKey: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;
    
    try {
      setSaving(true);
      await api.deleteEmailTemplate(templateKey);
      toast({ title: 'Succès', description: 'Template supprimé' });
      setSelectedTemplate(null);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Signature CRUD functions
  const saveSignature = async () => {
    if (!selectedSignature) return;
    
    try {
      setSaving(true);
      await api.updateEmailSignature({
        signatureKey: selectedSignature.signature_key,
        name: selectedSignature.name,
        description: selectedSignature.description,
        bodyHtml: selectedSignature.body_html,
        logoUrl: selectedSignature.logo_url,
        photoUrl: selectedSignature.photo_url,
        isActive: selectedSignature.is_active,
        isDefault: selectedSignature.is_default
      });
      toast({ title: 'Succès', description: 'Signature enregistrée' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createSignature = async () => {
    if (!newSignature.signature_key || !newSignature.name || !newSignature.body_html) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    
    // Validate signature_key format (snake_case: lowercase letters, numbers, underscores)
    const signatureKeyRegex = /^[a-z][a-z0-9_]*$/;
    if (!signatureKeyRegex.test(newSignature.signature_key)) {
      toast({ 
        title: 'Erreur', 
        description: 'La clé de la signature doit être en snake_case (lettres minuscules, chiffres et underscores)', 
        variant: 'destructive' 
      });
      return;
    }
    
    try {
      setSaving(true);
      await api.createEmailSignature({
        signatureKey: newSignature.signature_key,
        name: newSignature.name,
        description: newSignature.description,
        bodyHtml: newSignature.body_html,
        logoUrl: newSignature.logo_url,
        photoUrl: newSignature.photo_url,
        isActive: newSignature.is_active,
        isDefault: newSignature.is_default
      });
      toast({ title: 'Succès', description: 'Signature créée avec succès' });
      setShowCreateSignatureForm(false);
      setNewSignature(defaultNewSignature);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteSignature = async (signatureKey: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette signature ?')) return;
    
    try {
      setSaving(true);
      await api.deleteEmailSignature(signatureKey);
      toast({ title: 'Succès', description: 'Signature supprimée' });
      setSelectedSignature(null);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File, isNewSignature: boolean) => {
    try {
      setUploadingPhoto(true);
      const url = await api.uploadSignaturePhoto(file);
      if (isNewSignature) {
        setNewSignature({ ...newSignature, photo_url: url });
      } else if (selectedSignature) {
        setSelectedSignature({ ...selectedSignature, photo_url: url });
      }
      toast({ title: 'Succès', description: 'Photo uploadée avec succès' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: `Échec du téléchargement de la photo: ${err.message}`, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({ title: 'Erreur', description: 'Veuillez entrer une adresse email', variant: 'destructive' });
      return;
    }
    
    try {
      setTesting(true);
      await api.testEmailConfig(testEmail);
      toast({ 
        title: 'Succès', 
        description: `Email de test envoyé à ${testEmail}. Vérifiez votre boîte de réception.` 
      });
      loadData(); // Refresh logs
    } catch (err: any) {
      toast({ 
        title: 'Erreur d\'envoi', 
        description: err.message || 'Impossible d\'envoyer l\'email de test. Vérifiez vos paramètres SMTP.', 
        variant: 'destructive' 
      });
    } finally {
      setTesting(false);
    }
  };

  const updateSetting = (key: keyof EmailSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres Email</h1>
          <p className="text-gray-500 mt-1">Configuration SMTP, templates, signatures et historique des envois</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="signatures" className="flex items-center gap-2">
            <Pen className="h-4 w-4" />
            Signatures
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            PDF Template
          </TabsTrigger>
        </TabsList>

        {/* SMTP Settings Tab */}
        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-orange-500" />
                Configuration Serveur SMTP
              </CardTitle>
              <CardDescription>
                Paramètres de connexion à votre serveur de messagerie (A2hosting, Gmail, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Hôte SMTP *</Label>
                  <Input
                    value={settings.smtp_host}
                    onChange={(e) => updateSetting('smtp_host', e.target.value)}
                    placeholder="mail.a2hosting.com"
                  />
                  <p className="text-xs text-gray-500">
                    Pour A2hosting: mail.a2hosting.com ou votre domaine
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Port SMTP *</Label>
                  <Select value={settings.smtp_port} onValueChange={(v) => updateSetting('smtp_port', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 (Non sécurisé)</SelectItem>
                      <SelectItem value="465">465 (SSL)</SelectItem>
                      <SelectItem value="587">587 (TLS - Recommandé)</SelectItem>
                      <SelectItem value="2525">2525 (Alternatif)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Utilisateur SMTP *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={settings.smtp_user}
                      onChange={(e) => updateSetting('smtp_user', e.target.value)}
                      placeholder="info@sunbox-mauritius.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Votre adresse email complète</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Mot de passe SMTP *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={settings.smtp_password}
                      onChange={(e) => updateSetting('smtp_password', e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Type de sécurité</Label>
                  <Select value={settings.smtp_secure} onValueChange={(v) => updateSetting('smtp_secure', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS (Recommandé pour port 587)</SelectItem>
                      <SelectItem value="ssl">SSL (Pour port 465)</SelectItem>
                      <SelectItem value="none">Aucun (Non recommandé)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Email d'expédition</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={settings.smtp_from_email}
                      onChange={(e) => updateSetting('smtp_from_email', e.target.value)}
                      placeholder="noreply@sunbox-mauritius.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Laissez vide pour utiliser l'utilisateur SMTP</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Nom d'expéditeur</Label>
                  <Input
                    value={settings.smtp_from_name}
                    onChange={(e) => updateSetting('smtp_from_name', e.target.value)}
                    placeholder="Sunbox Mauritius"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Tester la Configuration
              </CardTitle>
              <CardDescription>
                Envoyez un email de test pour vérifier que vos paramètres sont corrects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1"
                  type="email"
                />
                <Button 
                  onClick={sendTestEmail} 
                  disabled={testing || !settings.smtp_host || !settings.smtp_user}
                  variant="outline"
                  className="min-w-[150px]"
                >
                  {testing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer un test
                    </>
                  )}
                </Button>
              </div>
              {(!settings.smtp_host || !settings.smtp_user) && (
                <div className="flex items-center gap-2 mt-4 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Configurez d'abord le serveur SMTP (hôte et utilisateur requis)</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 px-8"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres SMTP'}
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-500" />
                Informations Entreprise
              </CardTitle>
              <CardDescription>
                Ces informations apparaîtront dans les emails envoyés aux clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de l'entreprise</Label>
                  <Input
                    value={settings.company_name}
                    onChange={(e) => updateSetting('company_name', e.target.value)}
                    placeholder="Sunbox Mauritius"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email de contact</Label>
                  <Input
                    value={settings.company_email}
                    onChange={(e) => updateSetting('company_email', e.target.value)}
                    placeholder="info@sunbox-mauritius.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={settings.company_phone}
                    onChange={(e) => updateSetting('company_phone', e.target.value)}
                    placeholder="+230 5250 1234"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={settings.company_address}
                    onChange={(e) => updateSetting('company_address', e.target.value)}
                    placeholder="Grand Baie, Mauritius"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-orange-500" />
                Configuration des Notifications
              </CardTitle>
              <CardDescription>
                Gérez les emails automatiques envoyés lors des événements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Email administrateur</Label>
                <Input
                  value={settings.admin_email}
                  onChange={(e) => updateSetting('admin_email', e.target.value)}
                  placeholder="admin@sunbox-mauritius.com"
                />
                <p className="text-xs text-gray-500">Recevra les notifications de nouveaux devis</p>
              </div>
              
              <div className="space-y-2">
                <Label>Emails en copie (CC)</Label>
                <Input
                  value={settings.cc_emails}
                  onChange={(e) => updateSetting('cc_emails', e.target.value)}
                  placeholder="commercial@sunbox-mauritius.com, manager@sunbox-mauritius.com"
                />
                <p className="text-xs text-gray-500">Séparez les adresses par des virgules</p>
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-medium">Notifications admin</p>
                    <p className="text-sm text-gray-500">Recevoir un email à chaque nouveau devis</p>
                  </div>
                  <Switch
                    checked={settings.send_admin_notifications === 'true'}
                    onCheckedChange={(checked) => updateSetting('send_admin_notifications', checked ? 'true' : 'false')}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-medium">Confirmations client</p>
                    <p className="text-sm text-gray-500">Envoyer un email de confirmation au client après soumission d'un devis</p>
                  </div>
                  <Switch
                    checked={settings.send_customer_confirmations === 'true'}
                    onCheckedChange={(checked) => updateSetting('send_customer_confirmations', checked ? 'true' : 'false')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 px-8"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les notifications'}
            </Button>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Templates d'Email
                  </CardTitle>
                  <CardDescription>
                    Personnalisez les emails automatiques. Utilisez {'{{variable}}'} pour les données dynamiques.
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setShowCreateForm(true)} 
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Create Form */}
              {showCreateForm && (
                <div className="mb-6 p-6 border rounded-lg bg-gray-50 space-y-4">
                  <h3 className="font-semibold">Créer un nouveau template</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de template *</Label>
                      <Select 
                        value={newTemplate.template_type} 
                        onValueChange={(v) => setNewTemplate({ ...newTemplate, template_type: v as TemplateType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quote">Devis</SelectItem>
                          <SelectItem value="notification">Notification</SelectItem>
                          <SelectItem value="password_reset">Réinitialisation mot de passe</SelectItem>
                          <SelectItem value="contact">Contact</SelectItem>
                          <SelectItem value="status_change">Changement de statut</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Catégorie du template</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Nom du template *</Label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="ex: Confirmation de devis"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Clé du template *</Label>
                      <Input
                        value={newTemplate.template_key}
                        onChange={(e) => setNewTemplate({ ...newTemplate, template_key: e.target.value })}
                        placeholder="ex: welcome_email, password_reset"
                      />
                      <p className="text-xs text-gray-500">Identifiant unique (snake_case recommandé)</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Sujet *</Label>
                      <Input
                        value={newTemplate.subject}
                        onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                        placeholder="ex: Bienvenue chez Sunbox Mauritius"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      placeholder="Description courte du template"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Corps HTML *</Label>
                    <WysiwygEditor
                      value={newTemplate.body_html}
                      onChange={(value) => setNewTemplate({ ...newTemplate, body_html: value })}
                      placeholder="Contenu HTML de l'email..."
                      minHeight="300px"
                      availableVariables={[
                        '{{customer_name}}', '{{customer_email}}', '{{customer_phone}}', '{{customer_address}}',
                        '{{reference}}', '{{model_name}}', '{{model_type}}', '{{base_price}}',
                        '{{options_total}}', '{{total_price}}', '{{valid_until}}', '{{customer_message}}',
                        '{{signature_logo}}', '{{signature_photo}}'
                      ]}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Corps Texte (fallback)</Label>
                    <Textarea
                      value={newTemplate.body_text}
                      onChange={(e) => setNewTemplate({ ...newTemplate, body_text: e.target.value })}
                      rows={3}
                      className="font-mono text-sm"
                      placeholder="Version texte de l'email..."
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setShowCreateForm(false); setNewTemplate(defaultNewTemplate); }}>
                      Annuler
                    </Button>
                    <Button onClick={createTemplate} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                      {saving ? 'Création...' : 'Créer le template'}
                    </Button>
                  </div>
                </div>
              )}

              {templates.length === 0 && !showCreateForm ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun template disponible</p>
                  <p className="text-sm mb-4">Cliquez sur "Nouveau template" pour en créer un</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${templateTypeColors[template.template_type] || templateTypeColors.other}`}>
                          {templateTypeLabels[template.template_type] || 'Autre'}
                        </span>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm mb-1">{template.name || template.template_key}</p>
                      <p className="text-xs text-gray-400 mb-2 font-mono">{template.template_key}</p>
                      <p className="text-xs text-gray-500 truncate">{template.subject}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedTemplate && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Modifier: {selectedTemplate.name || selectedTemplate.template_key}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${templateTypeColors[selectedTemplate.template_type] || templateTypeColors.other}`}>
                        {templateTypeLabels[selectedTemplate.template_type] || 'Autre'}
                      </span>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteTemplate(selectedTemplate.template_key)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de template</Label>
                      <Select 
                        value={selectedTemplate.template_type} 
                        onValueChange={(v) => setSelectedTemplate({ ...selectedTemplate, template_type: v as TemplateType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quote">Devis</SelectItem>
                          <SelectItem value="notification">Notification</SelectItem>
                          <SelectItem value="password_reset">Réinitialisation mot de passe</SelectItem>
                          <SelectItem value="contact">Contact</SelectItem>
                          <SelectItem value="status_change">Changement de statut</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Nom du template</Label>
                      <Input
                        value={selectedTemplate.name || ''}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={selectedTemplate.description || ''}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, description: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sujet</Label>
                    <Input
                      value={selectedTemplate.subject}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Corps HTML</Label>
                    <WysiwygEditor
                      value={selectedTemplate.body_html}
                      onChange={(value) => setSelectedTemplate({ ...selectedTemplate, body_html: value })}
                      placeholder="Contenu HTML de l'email..."
                      minHeight="400px"
                      availableVariables={[
                        '{{customer_name}}', '{{customer_email}}', '{{customer_phone}}', '{{customer_address}}',
                        '{{reference}}', '{{model_name}}', '{{model_type}}', '{{base_price}}',
                        '{{options_total}}', '{{total_price}}', '{{valid_until}}', '{{customer_message}}',
                        '{{signature_logo}}', '{{signature_photo}}'
                      ]}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Corps Texte (fallback)</Label>
                    <Textarea
                      value={selectedTemplate.body_text || ''}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body_text: e.target.value })}
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                      Annuler
                    </Button>
                    <Button onClick={saveTemplate} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                      {saving ? 'Enregistrement...' : 'Enregistrer le template'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Variables disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {[
                  '{{customer_name}}', '{{customer_email}}', '{{customer_phone}}', '{{customer_address}}',
                  '{{reference}}', '{{model_name}}', '{{model_type}}', '{{base_price}}',
                  '{{options_total}}', '{{total_price}}', '{{valid_until}}', '{{customer_message}}',
                  '{{signature_logo}}', '{{signature_photo}}'
                ].map((variable) => (
                  <code key={variable} className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {variable}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pen className="h-5 w-5 text-orange-500" />
                Signatures Email
              </CardTitle>
              <CardDescription>
                Gérez vos signatures email avec logo et photo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowCreateSignatureForm(!showCreateSignatureForm)} 
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle signature
                </Button>
              </div>

              {showCreateSignatureForm && (
                <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  <h3 className="font-semibold text-lg">Créer une nouvelle signature</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom de la signature *</Label>
                      <Input
                        value={newSignature.name}
                        onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                        placeholder="ex: Signature Secrétaire"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Clé de la signature *</Label>
                      <Input
                        value={newSignature.signature_key}
                        onChange={(e) => setNewSignature({ ...newSignature, signature_key: e.target.value })}
                        placeholder="ex: secretary_signature"
                      />
                      <p className="text-xs text-gray-500">Identifiant unique (snake_case recommandé)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newSignature.description}
                      onChange={(e) => setNewSignature({ ...newSignature, description: e.target.value })}
                      placeholder="Description courte de la signature"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Logo
                      </Label>
                      <div className="p-3 bg-gray-100 rounded-lg border">
                        {siteLogo ? (
                          <div className="flex items-center gap-3">
                            <img 
                              src={siteLogo} 
                              alt="Logo du site" 
                              className="h-10 object-contain"
                              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                            />
                            <p className="text-sm text-gray-600">Logo du site (configuré dans Paramètres &gt; Site)</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Aucun logo configuré. Configurez-le dans Paramètres &gt; Site</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Utilisez {'{{signature_logo}}'} dans le contenu HTML</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Photo
                      </Label>
                      <div className="flex items-center gap-3">
                        {newSignature.photo_url && (
                          <img 
                            src={newSignature.photo_url} 
                            alt="Photo" 
                            className="h-16 w-16 object-cover border rounded-full"
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                          />
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            ref={newPhotoInputRef}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(file, true);
                            }}
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            onClick={() => newPhotoInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingPhoto ? 'Upload en cours...' : 'Uploader une photo'}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Utilisez {'{{signature_photo}}'} dans le contenu HTML</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contenu HTML de la signature *</Label>
                    <WysiwygEditor
                      value={newSignature.body_html}
                      onChange={(value) => setNewSignature({ ...newSignature, body_html: value })}
                      placeholder="Créez votre signature email..."
                      minHeight="250px"
                      availableVariables={[
                        '{{signature_logo}}', '{{signature_photo}}',
                        '{{sender_name}}', '{{sender_title}}', '{{sender_email}}', '{{sender_phone}}'
                      ]}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newSignature.is_active}
                        onCheckedChange={(checked) => setNewSignature({ ...newSignature, is_active: checked })}
                      />
                      <Label>Actif</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newSignature.is_default}
                        onCheckedChange={(checked) => setNewSignature({ ...newSignature, is_default: checked })}
                      />
                      <Label>Signature par défaut</Label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setShowCreateSignatureForm(false); setNewSignature(defaultNewSignature); }}>
                      Annuler
                    </Button>
                    <Button onClick={createSignature} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                      {saving ? 'Création...' : 'Créer la signature'}
                    </Button>
                  </div>
                </div>
              )}

              {signatures.length === 0 && !showCreateSignatureForm ? (
                <div className="text-center py-8 text-gray-500">
                  <Pen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune signature disponible</p>
                  <p className="text-sm mb-4">Cliquez sur "Nouvelle signature" pour en créer une</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {signatures.map((signature) => (
                    <div
                      key={signature.id}
                      onClick={() => setSelectedSignature(signature)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedSignature?.id === signature.id 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {signature.is_default && (
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                            Par défaut
                          </span>
                        )}
                        <Badge variant={signature.is_active ? 'default' : 'secondary'}>
                          {signature.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm mb-1">{signature.name}</p>
                      <p className="text-xs text-gray-400 mb-2 font-mono">{signature.signature_key}</p>
                      {signature.description && (
                        <p className="text-xs text-gray-500 truncate">{signature.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {selectedSignature && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Modifier: {selectedSignature.name}</h3>
                      <p className="text-xs text-gray-400 font-mono">{selectedSignature.signature_key}</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteSignature(selectedSignature.signature_key)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom de la signature</Label>
                      <Input
                        value={selectedSignature.name || ''}
                        onChange={(e) => setSelectedSignature({ ...selectedSignature, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={selectedSignature.description || ''}
                        onChange={(e) => setSelectedSignature({ ...selectedSignature, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Logo
                      </Label>
                      <div className="p-3 bg-gray-100 rounded-lg border">
                        {siteLogo ? (
                          <div className="flex items-center gap-3">
                            <img 
                              src={siteLogo} 
                              alt="Logo du site" 
                              className="h-10 object-contain"
                              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                            />
                            <p className="text-sm text-gray-600">Logo du site (configuré dans Paramètres &gt; Site)</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Aucun logo configuré. Configurez-le dans Paramètres &gt; Site</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Utilisez {'{{signature_logo}}'} dans le contenu HTML</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Photo
                      </Label>
                      <div className="flex items-center gap-3">
                        {selectedSignature.photo_url && (
                          <img 
                            src={selectedSignature.photo_url} 
                            alt="Photo" 
                            className="h-16 w-16 object-cover border rounded-full"
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                          />
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            ref={editPhotoInputRef}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(file, false);
                            }}
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            onClick={() => editPhotoInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingPhoto ? 'Upload en cours...' : 'Changer la photo'}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Utilisez {'{{signature_photo}}'} dans le contenu HTML</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contenu HTML de la signature</Label>
                    <WysiwygEditor
                      value={selectedSignature.body_html}
                      onChange={(value) => setSelectedSignature({ ...selectedSignature, body_html: value })}
                      placeholder="Créez votre signature email..."
                      minHeight="350px"
                      availableVariables={[
                        '{{signature_logo}}', '{{signature_photo}}',
                        '{{sender_name}}', '{{sender_title}}', '{{sender_email}}', '{{sender_phone}}'
                      ]}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedSignature.is_active}
                        onCheckedChange={(checked) => setSelectedSignature({ ...selectedSignature, is_active: checked })}
                      />
                      <Label>Actif</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedSignature.is_default}
                        onCheckedChange={(checked) => setSelectedSignature({ ...selectedSignature, is_default: checked })}
                      />
                      <Label>Signature par défaut</Label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedSignature(null)}>
                      Annuler
                    </Button>
                    <Button onClick={saveSignature} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                      {saving ? 'Enregistrement...' : 'Enregistrer la signature'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Variables disponibles pour les signatures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {[
                  '{{signature_logo}}', '{{signature_photo}}',
                  '{{sender_name}}', '{{sender_title}}', '{{sender_email}}', '{{sender_phone}}'
                ].map((variable) => (
                  <code key={variable} className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {variable}
                  </code>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                <strong>Note:</strong> Les variables {'{{signature_logo}}'} et {'{{signature_photo}}'} seront automatiquement remplacées 
                par les images définies dans les champs URL correspondants. Vous pouvez également utiliser ces 
                variables dans les templates d'email pour insérer dynamiquement la signature.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-orange-500" />
                Historique des Emails
              </CardTitle>
              <CardDescription>
                Derniers emails envoyés par le système
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun email envoyé pour le moment</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Date</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Destinataire</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Sujet</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Template</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 text-sm">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="py-3 px-2 text-sm">{log.recipient_email}</td>
                          <td className="py-3 px-2 text-sm max-w-[200px] truncate">{log.subject}</td>
                          <td className="py-3 px-2 text-sm">
                            {log.template_key ? (
                              <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{log.template_key}</code>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={
                              log.status === 'sent' ? 'default' : 
                              log.status === 'failed' ? 'destructive' : 'secondary'
                            }>
                              {log.status === 'sent' ? 'Envoyé' : 
                               log.status === 'failed' ? 'Échec' : 'En attente'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Template Tab */}
        <TabsContent value="pdf" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5 text-orange-500" />
                Modèle PDF des Devis
              </CardTitle>
              <CardDescription>
                Choisissez un template et personnalisez l'apparence des documents PDF générés pour les devis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

              {/* ── Template picker ─────────────────────────────────────────── */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Template PDF</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(TEMPLATE_NAMES).map(([id, name]) => {
                    const isSelected = (pdfSettings.pdf_template || '1') === id;
                    const templateColors: Record<string, { h: string; a: string }> = {
                      '1': { h: '#1A365D', a: '#f97316' },
                      '2': { h: '#111827', a: '#f97316' },
                      '3': { h: '#ea580c', a: '#1A365D' },
                      '4': { h: '#0f172a', a: '#f97316' },
                      '5': { h: '#1A365D', a: '#f97316' },
                      '6': { h: '#0d9488', a: '#f97316' },
                    };
                    const tc = templateColors[id];
                    return (
                      <button
                        key={id}
                        onClick={() => setPdfSettings({ ...pdfSettings, pdf_template: id })}
                        className={`relative rounded-xl border-2 overflow-hidden text-left transition-all hover:shadow-md ${
                          isSelected ? 'border-orange-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Mini preview */}
                        <div className="h-28 bg-white p-0 overflow-hidden">
                          <div style={{ background: tc.h }} className="h-10 flex items-center justify-between px-2">
                            <div className="w-6 h-4 bg-white/20 rounded" />
                            <div className="text-right">
                              <div style={{ background: tc.a }} className="inline-block text-white text-[6px] font-bold px-1 py-0.5 rounded mb-0.5">DEVIS</div>
                              <div className="text-white text-[7px] opacity-80">Réf. XXXXX</div>
                            </div>
                          </div>
                          <div className="p-2 space-y-1">
                            <div className="flex gap-1">
                              <div className="flex-1 bg-gray-100 rounded h-3" />
                              <div className="flex-1 bg-gray-100 rounded h-3" />
                            </div>
                            <div className="bg-gray-100 rounded h-2 w-3/4" />
                            <div className="bg-gray-100 rounded h-2 w-1/2" />
                            <div style={{ background: tc.a }} className="rounded h-3 mt-2 w-full opacity-80" />
                          </div>
                        </div>
                        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                          <div className="font-semibold text-sm text-gray-800">{name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 leading-tight">{TEMPLATE_DESCRIPTIONS[id]}</div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {/* Preview button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPreviewTemplateId(id); }}
                          className="absolute bottom-10 right-2 flex items-center gap-1 bg-white/90 hover:bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-orange-600 text-[10px] font-medium px-2 py-1 rounded transition-colors"
                          title="Aperçu complet"
                        >
                          <ZoomIn className="h-3 w-3" />
                          Aperçu
                        </button>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Customisation ──────────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colors */}
                <div className="space-y-2">
                  <Label>Couleur principale</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={pdfSettings.pdf_primary_color}
                      onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_primary_color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={pdfSettings.pdf_primary_color}
                      onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_primary_color: e.target.value })}
                      placeholder="#1A365D"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-gray-500">En-tête, titres de section</p>
                </div>
                <div className="space-y-2">
                  <Label>Couleur accent</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={pdfSettings.pdf_accent_color}
                      onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_accent_color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={pdfSettings.pdf_accent_color}
                      onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_accent_color: e.target.value })}
                      placeholder="#f97316"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-gray-500">Bordures, totaux, mise en évidence</p>
                </div>
              </div>

              {/* Font & Logo position */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Police de caractères</Label>
                  <Select
                    value={pdfSettings.pdf_font || 'inter'}
                    onValueChange={(v) => setPdfSettings({ ...pdfSettings, pdf_font: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une police" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inter">Inter (défaut)</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="poppins">Poppins</SelectItem>
                      <SelectItem value="lato">Lato</SelectItem>
                      <SelectItem value="playfair">Playfair Display (serif)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position du logo</Label>
                  <Select
                    value={pdfSettings.pdf_logo_position || 'left'}
                    onValueChange={(v) => setPdfSettings({ ...pdfSettings, pdf_logo_position: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="center">Centre</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Validity */}
              <div className="space-y-2">
                <Label>Validité du devis (jours)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={pdfSettings.pdf_validity_days}
                  onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_validity_days: e.target.value })}
                  className="w-40"
                />
                <p className="text-sm text-gray-500">Durée par défaut de validité des devis</p>
              </div>

              {/* Display options */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Sections à afficher</Label>
                <div className="space-y-3">
                  {[
                    { key: 'pdf_show_logo' as keyof PdfSettings, label: 'Logo de la société', desc: 'Afficher le logo en haut du document' },
                    { key: 'pdf_show_vat' as keyof PdfSettings, label: 'TVA', desc: 'Afficher le montant de TVA dans le récapitulatif' },
                    { key: 'pdf_show_terms' as keyof PdfSettings, label: 'Conditions générales', desc: 'Afficher les conditions en bas du PDF' },
                    { key: 'pdf_show_bank_details' as keyof PdfSettings, label: 'Coordonnées bancaires', desc: 'Afficher les informations de paiement' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-6 py-2">
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-sm text-gray-500">{desc}</p>
                      </div>
                      <Switch
                        checked={pdfSettings[key] === 'true'}
                        onCheckedChange={(v) => setPdfSettings({ ...pdfSettings, [key]: v ? 'true' : 'false' })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer text */}
              <div className="space-y-2">
                <Label>Texte de pied de page</Label>
                <Input
                  value={pdfSettings.pdf_footer_text}
                  onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_footer_text: e.target.value })}
                  placeholder="Sunbox Ltd – Grand Baie, Mauritius | info@sunbox-mauritius.com"
                />
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <Label>Conditions générales</Label>
                <Textarea
                  rows={4}
                  value={pdfSettings.pdf_terms}
                  onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_terms: e.target.value })}
                  placeholder="Entrez ici les conditions générales de vente..."
                />
              </div>

              {/* Bank details */}
              {pdfSettings.pdf_show_bank_details === 'true' && (
                <div className="space-y-2">
                  <Label>Coordonnées bancaires</Label>
                  <Textarea
                    rows={3}
                    value={pdfSettings.pdf_bank_details}
                    onChange={(e) => setPdfSettings({ ...pdfSettings, pdf_bank_details: e.target.value })}
                    placeholder={"Banque : MCB\nIBAN : MU12 MCBL 0000 0000 0000 0000 000\nBIC : MCBLMUMU"}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={savePdfSettings} disabled={savingPdf}>
                  {savingPdf ? 'Enregistrement…' : 'Enregistrer les paramètres PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── PDF Template Preview Dialog ────────────────────────────────────── */}
      {previewTemplateId && (() => {
        const previewSettings: PdfDisplaySettings = {
          pdf_primary_color:     pdfSettings.pdf_primary_color,
          pdf_accent_color:      pdfSettings.pdf_accent_color,
          pdf_footer_text:       pdfSettings.pdf_footer_text || 'Sunbox Ltd – Grand Baie, Mauritius | info@sunbox-mauritius.com',
          pdf_terms:             pdfSettings.pdf_terms || 'Ce devis est valable pour la durée indiquée.',
          pdf_bank_details:      pdfSettings.pdf_bank_details || '',
          pdf_validity_days:     pdfSettings.pdf_validity_days || '30',
          pdf_show_logo:         pdfSettings.pdf_show_logo,
          pdf_show_vat:          pdfSettings.pdf_show_vat,
          pdf_show_bank_details: pdfSettings.pdf_show_bank_details,
          pdf_show_terms:        pdfSettings.pdf_show_terms,
          pdf_template:          previewTemplateId,
          pdf_font:              pdfSettings.pdf_font || 'inter',
          pdf_logo_position:     pdfSettings.pdf_logo_position || 'left',
        };

        const sampleCompany: CompanyInfo = {
          company_name:    'Sunbox Mauritius',
          company_email:   'info@sunbox-mauritius.com',
          company_phone:   '+230 5250 1234',
          company_address: 'Royal Road, Grand Baie, Mauritius',
        };

        const fallbackData: QuotePdfData = {
          id: 0,
          reference_number: 'WCQ-202602-000001',
          created_at:       new Date().toISOString(),
          valid_until:      new Date(Date.now() + 30 * 86400000).toISOString(),
          status:           'pending',
          customer_name:    'Jean Dupont',
          customer_email:   'jean.dupont@example.com',
          customer_phone:   '+230 5999 0000',
          customer_address: 'Quatre Bornes, Mauritius',
          model_name:       'Sunbox Classic 40ft',
          model_type:       'container',
          quote_title:      undefined,
          photo_url:        '',
          plan_url:         '',
          base_price:       2800000,
          options_total:    350000,
          total_price:      3150000,
          vat_rate:         15,
          is_free_quote:    false,
          options: [
            { option_name: 'Climatisation 3 pièces',  option_price: 120000 },
            { option_name: 'Cuisine équipée',          option_price: 95000  },
            { option_name: 'Panneaux solaires 5 kWc', option_price: 135000 },
          ],
          categories: [],
        };

        const activeData = previewQuoteData || fallbackData;
        const isRealQuote = !!previewQuoteData;

        const templateFn = TEMPLATES[previewTemplateId] || TEMPLATES['1'];
        const html = templateFn(activeData, previewSettings, sampleCompany, siteLogo || '');

        const closePreview = () => {
          setPreviewTemplateId(null);
          setPreviewQuoteId(null);
          setPreviewQuoteData(null);
        };

        return (
          <Dialog open onOpenChange={closePreview}>
            <DialogContent className="max-w-5xl w-full p-0 overflow-hidden bg-gray-100">

              {/* ── Top bar: template switcher + close ── */}
              <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="font-semibold text-gray-800 whitespace-nowrap">
                    Aperçu — {TEMPLATE_NAMES[previewTemplateId]}
                  </span>
                  {isRealQuote
                    ? <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">● Devis réel</span>
                    : <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">◌ Démonstration</span>
                  }
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {Object.keys(TEMPLATE_NAMES).map((tid) => (
                    <button
                      key={tid}
                      onClick={() => setPreviewTemplateId(tid)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        tid === previewTemplateId
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {TEMPLATE_NAMES[tid]}
                    </button>
                  ))}
                  <button onClick={closePreview} className="ml-1 p-1.5 rounded hover:bg-gray-100 text-gray-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ── Quote selector bar ── */}
              <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Devis :</label>
                <select
                  value={previewQuoteId ?? ''}
                  onChange={(e) => setPreviewQuoteId(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 max-w-md"
                >
                  <option value="">— Utiliser les données de démonstration —</option>
                  {previewQuotes.map((q: any) => (
                    <option key={q.id} value={q.id}>
                      {q.reference_number} · {q.customer_name}
                      {q.is_free_quote ? ` · ${q.quote_title || 'Devis libre'}` : q.model_name ? ` · ${q.model_name}` : ''}
                    </option>
                  ))}
                </select>
                {previewQuoteLoading && (
                  <span className="text-xs text-gray-400 animate-pulse">Chargement…</span>
                )}
                {isRealQuote && (
                  <button
                    onClick={() => { setPreviewQuoteId(null); setPreviewQuoteData(null); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Effacer
                  </button>
                )}
              </div>

              {/* ── Scrollable A4 preview ── */}
              <div className="overflow-auto max-h-[76vh] p-6 flex justify-center">
                {previewQuoteLoading ? (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <div className="h-8 w-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Chargement du devis…
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ width: 794, minWidth: 794, transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-15%' }}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
