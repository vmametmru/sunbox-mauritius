import React, { useEffect, useState } from 'react';
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
  Trash2
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
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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

interface EmailTemplate {
  id: number;
  template_key: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_active: boolean;
}

interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  template_key: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string;
  created_at: string;
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
  subject: '',
  body_html: '',
  body_text: '',
  is_active: true,
};

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>(defaultSettings);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('smtp');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<EmailTemplate, 'id'>>(defaultNewTemplate);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load settings
      const settingsResult = await api.getSettings();
      if (settingsResult) {
        setSettings({ ...defaultSettings, ...settingsResult });
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

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setSaving(true);
      await api.updateEmailTemplate(
        selectedTemplate.template_key,
        selectedTemplate.subject,
        selectedTemplate.body_html,
        selectedTemplate.body_text
      );
      toast({ title: 'Succès', description: 'Template enregistré' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.template_key || !newTemplate.subject || !newTemplate.body_html) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    
    try {
      setSaving(true);
      await api.createEmailTemplate(
        newTemplate.template_key,
        newTemplate.subject,
        newTemplate.body_html,
        newTemplate.body_text,
        newTemplate.is_active
      );
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
          <p className="text-gray-500 mt-1">Configuration SMTP, templates et historique des envois</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
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
                    <Label>Corps HTML *</Label>
                    <Textarea
                      value={newTemplate.body_html}
                      onChange={(e) => setNewTemplate({ ...newTemplate, body_html: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                      placeholder="<html><body>Contenu HTML de l'email...</body></html>"
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
                        <span className="font-medium text-sm">{template.template_key}</span>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{template.subject}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedTemplate && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Modifier: {selectedTemplate.template_key}</h3>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteTemplate(selectedTemplate.template_key)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
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
                    <Textarea
                      value={selectedTemplate.body_html}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body_html: e.target.value })}
                      rows={12}
                      className="font-mono text-sm"
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
                  '{{options_total}}', '{{total_price}}', '{{valid_until}}', '{{customer_message}}'
                ].map((variable) => (
                  <code key={variable} className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {variable}
                  </code>
                ))}
              </div>
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
      </Tabs>
    </div>
  );
}
