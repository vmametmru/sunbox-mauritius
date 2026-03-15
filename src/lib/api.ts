// API client for MySQL database operations via PHP backend on A2hosting
// IMPORTANT: Update API_BASE_URL with your actual domain

// Allow deployed pro sites to override the API base URL via window.__API_BASE_URL__
export const API_BASE_URL: string =
  (typeof window !== 'undefined' && (window as any).__API_BASE_URL__)
    ? String((window as any).__API_BASE_URL__)
    : 'https://sunbox-mauritius.com/api';
// const API_BASE_URL = 'http://localhost/sunbox/api';

// ── API call logger ───────────────────────────────────────────────────────────
export interface ApiLogEntry {
  id: number;
  action: string;
  timestamp: string;   // ISO 8601
  durationMs: number;
  status: 'ok' | 'error';
  error?: string;
}

let _logCounter = 0;
const _logs: ApiLogEntry[] = [];
const LOG_MAX = 100;

export function getApiLogs(): ApiLogEntry[] {
  return [..._logs];
}

export function clearApiLogs(): void {
  _logs.length = 0;
  _logCounter  = 0;
}

function _pushLog(entry: ApiLogEntry): void {
  _logs.unshift(entry); // newest first
  if (_logs.length > LOG_MAX) _logs.length = LOG_MAX;
}

export const api = {
  /* =====================================================
     GENERIC
  ===================================================== */
  async query(action: string, data: Record<string, any> = {}) {
    const startMs = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/index.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const text = await response.text();
      if (!text.trim()) {
        throw new Error(`Réponse vide du serveur (action: ${action})`);
      }
      let result: any;
      try {
        result = JSON.parse(text);
      } catch (parseErr: any) {
        throw new Error(`Réponse invalide du serveur (action: ${action}): ${parseErr.message}`);
      }
      if (!response.ok || result.error) {
        throw new Error(result.error || 'API request failed');
      }
      _pushLog({ id: ++_logCounter, action, timestamp: new Date().toISOString(), durationMs: Date.now() - startMs, status: 'ok' });
      return result.data !== undefined ? result.data : result;
    } catch (err: any) {
      _pushLog({ id: ++_logCounter, action, timestamp: new Date().toISOString(), durationMs: Date.now() - startMs, status: 'error', error: err.message });
      throw err;
    }
  },

  /* =====================================================
     DASHBOARD
  ===================================================== */
  getDashboardStats() {
    return this.query('get_dashboard_stats');
  },

  checkDbVersion() {
    return this.query('check_db_version');
  },

  updateDbSchema() {
    return this.query('update_db_schema');
  },

  /* =====================================================
     MODEL TYPES (admin-managed dynamic types)
  ===================================================== */
  getModelTypes(activeOnly: boolean = false) {
    return this.query('get_model_types', { active_only: activeOnly });
  },

  createModelType(type: {
    slug: string;
    name: string;
    description?: string;
    icon_name?: string;
    display_order?: number;
    is_active?: boolean;
  }) {
    return this.query('create_model_type', type);
  },

  updateModelType(type: {
    id: number;
    name?: string;
    description?: string;
    icon_name?: string;
    display_order?: number;
    is_active?: boolean;
  }) {
    return this.query('update_model_type', type);
  },

  deleteModelType(id: number) {
    return this.query('delete_model_type', { id });
  },

  /* =====================================================
     MODEL TYPE DIMENSIONS (per-type configurable input dims)
  ===================================================== */
  getModelTypeDimensions(modelTypeSlug: string) {
    return this.query('get_model_type_dimensions', { model_type_slug: modelTypeSlug });
  },

  createModelTypeDimension(dim: {
    model_type_slug: string;
    slug: string;
    label: string;
    unit?: string;
    min_value?: number;
    max_value?: number;
    step?: number;
    default_value?: number;
    display_order?: number;
  }) {
    return this.query('create_model_type_dimension', dim);
  },

  updateModelTypeDimension(dim: {
    id: number;
    label?: string;
    unit?: string;
    min_value?: number;
    max_value?: number;
    step?: number;
    default_value?: number;
    display_order?: number;
  }) {
    return this.query('update_model_type_dimension', dim);
  },

  deleteModelTypeDimension(id: number) {
    return this.query('delete_model_type_dimension', { id });
  },

  /* =====================================================
     MODELS (DB-DRIVEN ONLY)
  ===================================================== */
  getModels(type?: string, activeOnly: boolean = true, includeBOQPrice: boolean = true) {
    return this.query('get_models', { type, active_only: activeOnly, include_boq_price: includeBOQPrice });
  },

  createModel(model: {
    name: string;
    type: string;
    description?: string;
    base_price: number;
    unforeseen_cost_percent?: number;
    surface_m2: number;
    bedrooms?: number;
    bathrooms?: number;
    container_20ft_count?: number;
    container_40ft_count?: number;
    pool_shape?: string;
    has_overflow?: boolean;
    modular_longueur?: number | null;
    modular_largeur?: number | null;
    modular_nb_etages?: number | null;
    image_url?: string;
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('create_model', model);
  },

  updateModel(model: {
    id: number;
    name?: string;
    type?: string;
    description?: string;
    base_price?: number;
    unforeseen_cost_percent?: number;
    surface_m2?: number;
    bedrooms?: number;
    bathrooms?: number;
    container_20ft_count?: number;
    container_40ft_count?: number;
    pool_shape?: string;
    has_overflow?: boolean;
    modular_longueur?: number | null;
    modular_largeur?: number | null;
    modular_nb_etages?: number | null;
    image_url?: string;
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('update_model', model);
  },

  deleteModel(id: number) {
    return this.query('delete_model', { id });
  },

  /* =====================================================
     MODEL OPTIONS (PER MODEL)
  ===================================================== */
  getModelOptions(modelId: number) {
    return this.query('get_model_options', { model_id: modelId });
  },

  createModelOption(option: {
    model_id: number;
    category_id?: number;
    name: string;
    description?: string;
    price: number;
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('create_model_option', option);
  },

  updateModelOption(option: {
    id: number;
    category_id?: number;
    name?: string;
    description?: string;
    price?: number;
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('update_model_option', option);
  },

  deleteModelOption(id: number) {
    return this.query('delete_model_option', { id });
  },

  copyModelOptions(fromModelId: number, toModelId: number) {
    return this.query('copy_model_options', {
      from_model_id: fromModelId,
      to_model_id: toModelId,
    });
  },

  /* =====================================================
     CATEGORY IMAGES
  ===================================================== */
  getCategoryImages() {
    return this.query('get_category_images');
  },

  /* =====================================================
     GALLERY IMAGES (Public)
  ===================================================== */
  getGalleryImages(region?: string, proUserId?: number | null) {
    const data: Record<string, any> = {};
    if (region) data.region = region;
    if (proUserId !== undefined && proUserId !== null) data.pro_user_id = proUserId;
    return this.query('get_gallery_images', data);
  },

  /* =====================================================
     SUPPLIERS (Fournisseurs)
  ===================================================== */
  getSuppliers(activeOnly: boolean = true) {
    return this.query('get_suppliers', { active_only: activeOnly });
  },

  createSupplier(supplier: {
    name: string;
    city?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
  }) {
    return this.query('create_supplier', supplier);
  },

  updateSupplier(supplier: {
    id: number;
    name: string;
    city?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
  }) {
    return this.query('update_supplier', supplier);
  },

  deleteSupplier(id: number) {
    return this.query('delete_supplier', { id });
  },

  /* =====================================================
     BOQ CATEGORIES
  ===================================================== */
  getBOQCategories(modelId: number) {
    return this.query('get_boq_categories', { model_id: modelId });
  },

  createBOQCategory(category: {
    model_id: number;
    parent_id?: number | null;
    name: string;
    is_option?: boolean;
    qty_editable?: boolean;
    display_order?: number;
    image_id?: number | null;
  }) {
    return this.query('create_boq_category', category);
  },

  updateBOQCategory(category: {
    id: number;
    parent_id?: number | null;
    name: string;
    is_option?: boolean;
    qty_editable?: boolean;
    display_order?: number;
    image_id?: number | null;
  }) {
    return this.query('update_boq_category', category);
  },

  deleteBOQCategory(id: number) {
    return this.query('delete_boq_category', { id });
  },

  /* =====================================================
     BOQ LINES
  ===================================================== */
  getBOQLines(categoryId: number) {
    return this.query('get_boq_lines', { category_id: categoryId });
  },

  createBOQLine(line: {
    category_id: number;
    description: string;
    quantity?: number;
    quantity_formula?: string | null;
    unit?: string;
    unit_cost_ht?: number;
    unit_cost_formula?: string | null;
    price_list_id?: number | null;
    supplier_id?: number | null;
    margin_percent?: number;
    display_order?: number;
  }) {
    return this.query('create_boq_line', line);
  },

  updateBOQLine(line: {
    id: number;
    description: string;
    quantity?: number;
    quantity_formula?: string | null;
    unit?: string;
    unit_cost_ht?: number;
    unit_cost_formula?: string | null;
    price_list_id?: number | null;
    supplier_id?: number | null;
    margin_percent?: number;
    display_order?: number;
  }) {
    return this.query('update_boq_line', line);
  },

  deleteBOQLine(id: number) {
    return this.query('delete_boq_line', { id });
  },

  updateBOQLineSupplier(id: number, supplier_id: number | null) {
    return this.query('update_boq_line_supplier', { id, supplier_id });
  },

  /* =====================================================
     BOQ UTILITIES
  ===================================================== */
  cloneBOQ(fromModelId: number, toModelId: number) {
    return this.query('clone_boq', {
      from_model_id: fromModelId,
      to_model_id: toModelId,
    });
  },

  resetBOQ(modelId: number) {
    return this.query('reset_boq', { model_id: modelId });
  },

  getModelBOQPrice(modelId: number) {
    return this.query('get_model_boq_price', { model_id: modelId });
  },

  getBOQOptions(modelId: number) {
    return this.query('get_boq_options', { model_id: modelId });
  },

  getBOQBaseCategories(modelId: number) {
    return this.query('get_boq_base_categories', { model_id: modelId });
  },

  getBOQCategoryLines(categoryId: number) {
    return this.query('get_boq_category_lines', { category_id: categoryId });
  },

  getPoolBOQFull(modelId: number) {
    return this.query('get_pool_boq_full', { model_id: modelId });
  },

  /* =====================================================
     QUOTES
  ===================================================== */
  getQuotes() {
    return this.query('get_quotes');
  },

  getQuotesByContact(contactId: number) {
    return this.query('get_quotes_by_contact', { contact_id: contactId });
  },

  getQuote(id: number) {
    return this.query('get_quote', { id });
  },

  getQuoteWithDetails(id: number) {
    return this.query('get_quote_with_details', { id });
  },

  createQuote(quote: {
    model_id: number;
    model_name: string;
    model_type: string;
    base_price: number;
    options_total: number;
    total_price: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address?: string;
    customer_message?: string;
    device_id?: string;
    selected_options?: Array<{ option_id: number; option_name: string; option_price: number; quantity?: number }>;
    // Pool dimensions
    pool_shape?: string;
    pool_longueur?: number | null;
    pool_largeur?: number | null;
    pool_profondeur?: number | null;
    pool_longueur_la?: number | null;
    pool_largeur_la?: number | null;
    pool_profondeur_la?: number | null;
    pool_longueur_lb?: number | null;
    pool_largeur_lb?: number | null;
    pool_profondeur_lb?: number | null;
    pool_longueur_ta?: number | null;
    pool_largeur_ta?: number | null;
    pool_profondeur_ta?: number | null;
    pool_longueur_tb?: number | null;
    pool_largeur_tb?: number | null;
    pool_profondeur_tb?: number | null;
    // Custom type dimensions (backward compat legacy columns)
    modular_longueur?: number | null;
    modular_largeur?: number | null;
    modular_nb_etages?: number | null;
    // Generic custom dimensions (slug → value) for all admin-created types
    custom_dimensions?: Record<string, number> | null;
  }) {
    return this.query('create_quote', quote);
  },

  createAdminQuote(quote: {
    // Customer info
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address?: string;
    customer_message?: string;
    contact_id?: number;
    // Quote type
    is_free_quote: boolean;
    quote_title?: string;
    // Model info (for model-based quotes)
    model_id?: number;
    model_name?: string;
    model_type?: 'container' | 'pool';
    // Pool dimensions (for pool model-based quotes)
    pool_shape?: string;
    pool_longueur?: number | null;
    pool_largeur?: number | null;
    pool_profondeur?: number | null;
    // Pricing
    base_price?: number;
    options_total?: number;
    total_price?: number;
    margin_percent?: number;
    // Media
    photo_url?: string;
    plan_url?: string;
    // Options (for model-based quotes)
    selected_options?: Array<{ option_id: number; option_name: string; option_price: number }>;
    // Categories (for free quotes)
    categories?: Array<{
      name: string;
      lines: Array<{
        description: string;
        quantity: number;
        unit: string;
        unit_cost_ht: number;
        margin_percent: number;
      }>;
    }>;
    // Clone reference
    cloned_from_id?: number;
  }) {
    return this.query('create_admin_quote', quote);
  },

  updateAdminQuote(quote: {
    id: number;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_address?: string;
    customer_message?: string;
    contact_id?: number;
    quote_title?: string;
    model_id?: number;
    model_name?: string;
    model_type?: 'container' | 'pool';
    // Pool dimensions (for pool model-based quotes)
    pool_shape?: string;
    pool_longueur?: number | null;
    pool_largeur?: number | null;
    pool_profondeur?: number | null;
    base_price?: number;
    options_total?: number;
    total_price?: number;
    margin_percent?: number;
    photo_url?: string;
    plan_url?: string;
    status?: string;
    notes?: string;
    selected_options?: Array<{ option_id: number; option_name: string; option_price: number }>;
    categories?: Array<{
      name: string;
      lines: Array<{
        description: string;
        quantity: number;
        unit: string;
        unit_cost_ht: number;
        margin_percent: number;
      }>;
    }>;
  }) {
    return this.query('update_admin_quote', quote);
  },

  cloneQuote(id: number) {
    return this.query('clone_quote', { id });
  },

  getQuoteCategories(quoteId: number) {
    return this.query('get_quote_categories', { quote_id: quoteId });
  },

  getQuoteLines(categoryId: number) {
    return this.query('get_quote_lines', { category_id: categoryId });
  },

  updateQuoteStatus(id: number, status: 'open' | 'validated' | 'approved' | 'rejected' | 'completed' | 'pending') {
    return this.query('update_quote_status', { id, status });
  },

  deleteQuote(id: number) {
    return this.query('delete_quote', { id });
  },

  /* =====================================================
     CONTACTS
  ===================================================== */
  getContacts() {
    return this.query('get_contacts');
  },

  getContact(id: number) {
    return this.query('get_contact', { id });
  },

  getContactByDevice(deviceId: string) {
    return this.query('get_contact_by_device', { device_id: deviceId });
  },

  updateContact(contact: {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: 'new' | 'read' | 'replied' | 'archived';
  }) {
    return this.query('update_contact', contact);
  },

  deleteContact(id: number) {
    return this.query('delete_contact', { id });
  },

  /* =====================================================
     SETTINGS
  ===================================================== */
  getSettings(group?: string) {
    return this.query('get_settings', group ? { group } : {});
  },

  updateSetting(key: string, value: string, group?: string) {
    return this.query('update_setting', { key, value, group });
  },

  updateSettingsBulk(settings: Array<{ key: string; value: string; group?: string }>) {
    return this.query('update_settings_bulk', { settings });
  },

  /* =====================================================
     EMAIL
  ===================================================== */
  getEmailTemplates(templateType?: string) {
    return this.query('get_email_templates', templateType ? { template_type: templateType } : {});
  },

  createEmailTemplate(data: {
    templateKey: string;
    templateType: string;
    name: string;
    description?: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    isActive?: boolean;
  }) {
    return this.query('create_email_template', { 
      template_key: data.templateKey,
      template_type: data.templateType,
      name: data.name,
      description: data.description,
      subject: data.subject, 
      body_html: data.bodyHtml, 
      body_text: data.bodyText,
      is_active: data.isActive ?? true
    });
  },

  updateEmailTemplate(data: {
    templateKey: string;
    templateType?: string;
    name?: string;
    description?: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
  }) {
    return this.query('update_email_template', { 
      template_key: data.templateKey,
      template_type: data.templateType,
      name: data.name,
      description: data.description,
      subject: data.subject, 
      body_html: data.bodyHtml, 
      body_text: data.bodyText 
    });
  },

  deleteEmailTemplate(templateKey: string) {
    return this.query('delete_email_template', { template_key: templateKey });
  },

  getEmailLogs(limit: number = 50) {
    return this.query('get_email_logs', { limit });
  },

  async testEmailConfig(toEmail: string) {
    const response = await fetch(`${API_BASE_URL}/email.php?action=test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toEmail }),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to send test email');
    }
    return result.data !== undefined ? result.data : result;
  },

  async sendTemplateEmail(data: {
    to: string | string[];
    template_key: string;
    data: Record<string, any>;
    cc?: string | string[];
  }) {
    const response = await fetch(`${API_BASE_URL}/email.php?action=send_template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to send email');
    }
    return result.data !== undefined ? result.data : result;
  },

  async sendQuotePdf(data: {
    to: string | string[];
    subject: string;
    html: string;
    pdf_base64: string;
    filename: string;
    cc?: string | string[];
  }) {
    const response = await fetch(`${API_BASE_URL}/email.php?action=send_quote_pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to send PDF email');
    }
    return result.data !== undefined ? result.data : result;
  },

  getQuoteByToken(token: string) {
    return this.query('get_quote_by_token', { token });
  },

  updateQuoteStatusByToken(token: string, status: 'approved' | 'rejected' | 'open') {
    return this.query('update_quote_status_by_token', { token, status });
  },

  /* =====================================================
     EMAIL SIGNATURES
  ===================================================== */
  getEmailSignatures() {
    return this.query('get_email_signatures');
  },

  createEmailSignature(data: {
    signatureKey: string;
    name: string;
    description?: string;
    bodyHtml: string;
    logoUrl?: string;
    photoUrl?: string;
    isActive?: boolean;
    isDefault?: boolean;
  }) {
    return this.query('create_email_signature', { 
      signature_key: data.signatureKey,
      name: data.name,
      description: data.description,
      body_html: data.bodyHtml,
      logo_url: data.logoUrl,
      photo_url: data.photoUrl,
      is_active: data.isActive ?? true,
      is_default: data.isDefault ?? false
    });
  },

  updateEmailSignature(data: {
    signatureKey: string;
    name?: string;
    description?: string;
    bodyHtml: string;
    logoUrl?: string;
    photoUrl?: string;
    isActive?: boolean;
    isDefault?: boolean;
  }) {
    return this.query('update_email_signature', { 
      signature_key: data.signatureKey,
      name: data.name,
      description: data.description,
      body_html: data.bodyHtml,
      logo_url: data.logoUrl,
      photo_url: data.photoUrl,
      is_active: data.isActive,
      is_default: data.isDefault
    });
  },

  deleteEmailSignature(signatureKey: string) {
    return this.query('delete_email_signature', { signature_key: signatureKey });
  },

  async uploadSignaturePhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload_signature_photo.php`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to upload photo');
    }
    return result.data?.url || result.url;
  },

  async uploadFreeQuotePhoto(file: File, mediaType: 'photo' | 'plan') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);
    
    const response = await fetch(`${API_BASE_URL}/media.php?action=free_quote_upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to upload photo');
    }
    return result.data?.url || result.url;
  },

  /* =====================================================
     DEVELOPMENT IDEAS
  ===================================================== */
  getDevIdeas() {
    return this.query('get_dev_ideas');
  },

  createDevIdea(idea: {
    name: string;
    script?: string;
    statut?: 'non_demarree' | 'en_cours' | 'completee';
    urgence?: 'urgent' | 'non_urgent';
    importance?: 'important' | 'non_important';
  }) {
    return this.query('create_dev_idea', idea);
  },

  updateDevIdea(idea: {
    id: number;
    name: string;
    script?: string;
    statut?: 'non_demarree' | 'en_cours' | 'completee';
    urgence?: 'urgent' | 'non_urgent';
    importance?: 'important' | 'non_important';
  }) {
    return this.query('update_dev_idea', idea);
  },

  deleteDevIdea(id: number) {
    return this.query('delete_dev_idea', { id });
  },

  reorderDevIdeas(orders: Array<{ id: number; priority_order: number }>) {
    return this.query('reorder_dev_ideas', { orders });
  },

  /* =====================================================
     POOL BOQ VARIABLES
  ===================================================== */
  getPoolBOQVariables() {
    return this.query('get_pool_boq_variables');
  },

  createPoolBOQVariable(variable: {
    name: string;
    label: string;
    unit?: string;
    formula: string;
    display_order?: number;
  }) {
    return this.query('create_pool_boq_variable', variable);
  },

  updatePoolBOQVariable(variable: {
    id: number;
    name: string;
    label: string;
    unit?: string;
    formula: string;
    display_order?: number;
  }) {
    return this.query('update_pool_boq_variable', variable);
  },

  deletePoolBOQVariable(id: number) {
    return this.query('delete_pool_boq_variable', { id });
  },

  /* =====================================================
     POOL BOQ PRICE LIST
  ===================================================== */
  getPoolBOQPriceList() {
    return this.query('get_pool_boq_price_list');
  },

  createPoolBOQPriceListItem(item: {
    name: string;
    unit?: string;
    unit_price?: number;
    has_vat?: boolean;
    supplier_id?: number | null;
    display_order?: number;
  }) {
    return this.query('create_pool_boq_price_list_item', item);
  },

  updatePoolBOQPriceListItem(item: {
    id: number;
    name: string;
    unit?: string;
    unit_price?: number;
    has_vat?: boolean;
    supplier_id?: number | null;
    display_order?: number;
  }) {
    return this.query('update_pool_boq_price_list_item', item);
  },

  deletePoolBOQPriceListItem(id: number) {
    return this.query('delete_pool_boq_price_list_item', { id });
  },

  /* =====================================================
     POOL BOQ TEMPLATES
  ===================================================== */
  getPoolBOQTemplates() {
    return this.query('get_pool_boq_templates');
  },

  createPoolBOQTemplate(template: {
    name: string;
    description?: string;
    is_default?: boolean;
    template_data?: any;
  }) {
    return this.query('create_pool_boq_template', template);
  },

  updatePoolBOQTemplate(template: {
    id: number;
    name?: string;
    description?: string;
    is_default?: boolean;
    template_data?: any;
  }) {
    return this.query('update_pool_boq_template', template);
  },

  deletePoolBOQTemplate(id: number) {
    return this.query('delete_pool_boq_template', { id });
  },

  getPoolBOQTemplateById(id: number) {
    return this.query('get_pool_boq_template_by_id', { id });
  },

  getDefaultPoolBOQTemplateFromDB() {
    return this.query('get_default_pool_boq_template');
  },

  /* =====================================================
     MODULAR BOQ VARIABLES
  ===================================================== */
  getModularBOQVariables(modelTypeSlug?: string) {
    return this.query('get_modular_boq_variables', modelTypeSlug ? { model_type_slug: modelTypeSlug } : {});
  },

  createModularBOQVariable(variable: {
    name: string;
    label: string;
    unit?: string;
    formula: string;
    display_order?: number;
    model_type_slug?: string;
  }) {
    return this.query('create_modular_boq_variable', variable);
  },

  updateModularBOQVariable(variable: {
    id: number;
    name: string;
    label: string;
    unit?: string;
    formula: string;
    display_order?: number;
    model_type_slug?: string;
  }) {
    return this.query('update_modular_boq_variable', variable);
  },

  deleteModularBOQVariable(id: number) {
    return this.query('delete_modular_boq_variable', { id });
  },

  /* =====================================================
     MODULAR BOQ PRICE LIST (redirected to unified pricelist)
  ===================================================== */
  getModularBOQPriceList() {
    return this.query('get_pool_boq_price_list');
  },

  createModularBOQPriceListItem(item: {
    name: string;
    unit?: string;
    unit_price?: number;
    has_vat?: boolean;
    supplier_id?: number | null;
    display_order?: number;
  }) {
    return this.query('create_pool_boq_price_list_item', item);
  },

  updateModularBOQPriceListItem(item: {
    id: number;
    name: string;
    unit?: string;
    unit_price?: number;
    has_vat?: boolean;
    supplier_id?: number | null;
    display_order?: number;
  }) {
    return this.query('update_pool_boq_price_list_item', item);
  },

  deleteModularBOQPriceListItem(id: number) {
    return this.query('delete_pool_boq_price_list_item', { id });
  },

  /* =====================================================
     MODULAR BOQ TEMPLATES
  ===================================================== */
  getModularBOQTemplates(modelTypeSlug?: string) {
    return this.query('get_modular_boq_templates', modelTypeSlug ? { model_type_slug: modelTypeSlug } : {});
  },

  createModularBOQTemplate(template: {
    name: string;
    description?: string;
    is_default?: boolean;
    template_data?: any;
    model_type_slug?: string;
  }) {
    return this.query('create_modular_boq_template', template);
  },

  updateModularBOQTemplate(template: {
    id: number;
    name?: string;
    description?: string;
    is_default?: boolean;
    template_data?: any;
    model_type_slug?: string;
  }) {
    return this.query('update_modular_boq_template', template);
  },

  deleteModularBOQTemplate(id: number) {
    return this.query('delete_modular_boq_template', { id });
  },

  getModularBOQTemplateById(id: number) {
    return this.query('get_modular_boq_template_by_id', { id });
  },

  getDefaultModularBOQTemplateFromDB(modelTypeSlug?: string) {
    return this.query('get_default_modular_boq_template', modelTypeSlug ? { model_type_slug: modelTypeSlug } : {});
  },

  getModularBOQFull(modelId: number) {
    return this.query('get_modular_boq_full', { model_id: modelId });
  },

  /* =====================================================
     DISCOUNTS
  ===================================================== */
  getDiscounts() {
    return this.query('get_discounts');
  },

  createDiscount(discount: {
    name: string;
    description?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    apply_to: 'base_price' | 'options' | 'both';
    start_date: string;
    end_date: string;
    is_active?: boolean;
    model_ids?: number[];
  }) {
    return this.query('create_discount', discount);
  },

  updateDiscount(discount: {
    id: number;
    name?: string;
    description?: string;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    apply_to?: 'base_price' | 'options' | 'both';
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
    model_ids?: number[];
  }) {
    return this.query('update_discount', discount);
  },

  deleteDiscount(id: number) {
    return this.query('delete_discount', { id });
  },

  getActiveDiscounts(modelId?: number) {
    return this.query('get_active_discounts', modelId ? { model_id: modelId } : {});
  },

  /* =====================================================
     PROFESSIONAL USERS (admin)
  ===================================================== */
  getProUsers() {
    return this.query('get_pro_users');
  },

  createProUser(user: { name: string; email: string; password: string; company_name: string; address?: string; vat_number?: string; brn_number?: string; phone?: string; domain?: string; db_name?: string }) {
    return this.query('create_pro_user', user);
  },

  updateProUser(user: { id: number; name?: string; email?: string; password?: string; is_active?: boolean; company_name?: string; address?: string; vat_number?: string; brn_number?: string; phone?: string; sunbox_margin_percent?: number; domain?: string; logo_url?: string; db_name?: string; theme_id?: number | null }) {
    return this.query('update_pro_user', user);
  },

  deleteProUser(id: number) {
    return this.query('delete_pro_user', { id });
  },

  regenerateProToken(id: number) {
    return this.query('regenerate_pro_token', { id });
  },

  deployProSite(userId: number) {
    return this.query('deploy_pro_site', { user_id: userId });
  },

  initProDb(userId: number) {
    return this.query('init_pro_db', { user_id: userId });
  },

  checkProVersions(userId: number) {
    return this.query('check_pro_versions', { user_id: userId });
  },

  // ── Semi-Pro Users ──────────────────────────────────────────────────────────
  getSemiProUsers() {
    return this.query('get_semi_pro_users');
  },

  createSemiProUser(user: { name: string; email: string; password: string; company_name: string; address?: string; vat_number?: string; brn_number?: string; phone?: string }) {
    return this.query('create_semi_pro_user', user);
  },

  updateSemiProUser(user: { id: number; name?: string; email?: string; password?: string; is_active?: boolean; company_name?: string; address?: string; vat_number?: string; brn_number?: string; phone?: string; logo_url?: string }) {
    return this.query('update_semi_pro_user', user);
  },

  deleteSemiProUser(id: number) {
    return this.query('delete_semi_pro_user', { id });
  },

  deploySemiProSite(params: { slug: string; company_name: string; db_name: string; logo_url?: string; domain?: string; login_bg_url?: string }) {
    return this.query('deploy_semi_pro_site', params);
  },

  getSemiProSiteVersion(slug: string) {
    return this.query('get_semi_pro_site_version', { slug });
  },

  getSemiProSiteConfig(slug?: string) {
    return this.query('get_semi_pro_site_config', { slug: slug ?? 'semi-pro' });
  },

  initSemiProDb(dbName: string) {
    return this.query('init_semi_pro_db', { db_name: dbName });
  },

  updateSemiProSite(params: { slug: string; company_name: string; db_name: string; logo_url?: string; domain?: string; login_bg_url?: string }) {
    return this.query('update_semi_pro_site', params);
  },

  updateSemiProDb(dbName: string) {
    return this.query('update_semi_pro_db', { db_name: dbName });
  },

  buyProPack(userId: number) {
    return this.query('buy_pro_pack', { user_id: userId });
  },

  getProModelOverrides(userId: number) {
    return this.query('get_pro_model_overrides', { user_id: userId });
  },

  setProModelOverride(override: { user_id: number; model_id: number; price_adjustment: number; is_enabled: boolean }) {
    return this.query('set_pro_model_override', override);
  },

  setProModelEnabled(userId: number, modelId: number, isEnabled: boolean) {
    return this.query('set_pro_model_enabled', { user_id: userId, model_id: modelId, is_enabled: isEnabled });
  },

  /* =====================================================
     PROFESSIONAL MODEL REQUESTS
  ===================================================== */
  getModelRequests(userId?: number) {
    return this.query('get_model_requests', userId ? { user_id: userId } : {});
  },

  createModelRequest(req: { description: string; container_20ft_count: number; container_40ft_count: number; bedrooms: number; bathrooms: number; sketch_url?: string }) {
    return this.query('create_model_request', req);
  },

  updateModelRequest(req: { id: number; status?: string; admin_notes?: string; linked_model_id?: number | null }) {
    return this.query('update_model_request', req);
  },

  /* =====================================================
     PRO PROFILE (self)
  ===================================================== */
  getProProfile() {
    return this.query('get_pro_profile', {});
  },

  updateProProfile(profile: { company_name?: string; address?: string; vat_number?: string; brn_number?: string; phone?: string; sunbox_margin_percent?: number; logo_url?: string }) {
    return this.query('update_pro_profile', profile);
  },

  getProCredits() {
    return this.query('get_pro_credits', {});
  },

  deductProCredits(amount: number, reason: string, quoteId?: number) {
    return this.query('deduct_pro_credits', { amount, reason, ...(quoteId ? { quote_id: quoteId } : {}) });
  },

  /* =====================================================
     PURCHASE REPORTS (Rapport d'Achat)
  ===================================================== */
  requestBoqReport(quoteId: number) {
    return this.query('request_boq_report', { quote_id: quoteId });
  },

  createPurchaseReport(quoteId: number) {
    return this.query('create_purchase_report', { quote_id: quoteId });
  },

  getQuotePurchaseReport(quoteId: number) {
    return this.query('get_quote_purchase_report', { quote_id: quoteId });
  },

  getPurchaseReports() {
    return this.query('get_purchase_reports');
  },

  getPurchaseReport(id: number) {
    return this.query('get_purchase_report', { id });
  },

  toggleReportItem(id: number) {
    return this.query('toggle_report_item', { id });
  },

  updateReportStatus(id: number, status: 'in_progress' | 'completed') {
    return this.query('update_report_status', { id, status });
  },

  deleteReport(id: number) {
    return this.query('delete_purchase_report', { id });
  },

  /* =====================================================
     PRO THEMES (admin)
  ===================================================== */
  getProThemes() {
    return this.query('get_pro_themes');
  },

  createProTheme(theme: Partial<ProTheme> & { name: string }) {
    return this.query('create_pro_theme', theme);
  },

  updateProTheme(theme: Partial<ProTheme> & { id: number }) {
    return this.query('update_pro_theme', theme);
  },

  deleteProTheme(id: number) {
    return this.query('delete_pro_theme', { id });
  },

  /* =====================================================
     HEADER IMAGES (pro user self-serve OR admin by userId)
  ===================================================== */
  getHeaderImages(userId?: number) {
    return this.query('get_header_images', userId ? { user_id: userId } : {});
  },

  updateHeaderImages(images: string[], userId?: number) {
    return this.query('update_header_images', { images, ...(userId ? { user_id: userId } : {}) });
  },

  /* =====================================================
     DEBUG
  ===================================================== */
  getDebugInfo() {
    return this.query('get_debug_info');
  },

  propagateProApiFiles() {
    return this.query('propagate_pro_api_files');
  },
};

export default api;

/* =====================================================
   SHARED TYPES
===================================================== */
export interface ProTheme {
  id: number;
  name: string;
  logo_position: 'left' | 'center' | 'right';
  header_height: 'small' | 'medium' | 'large' | 'hero';
  header_bg_color: string;
  header_text_color: string;
  font_family: string;
  nav_position: 'left' | 'center' | 'right';
  nav_has_background: boolean;
  nav_bg_color: string;
  nav_text_color: string;
  nav_hover_color: string;
  button_color: string;
  button_text_color: string;
  footer_bg_color: string;
  footer_text_color: string;
  created_at?: string;
  updated_at?: string;
}

/** Configurable dimension for a custom model type (e.g. Longueur, Hauteur). */
export interface ModelTypeDimension {
  id: number;
  model_type_slug: string;
  slug: string;
  label: string;
  unit: string;
  min_value: number;
  max_value: number;
  step: number;
  default_value: number;
  display_order: number;
}

/** Admin-managed custom model type. */
export interface ModelType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}
