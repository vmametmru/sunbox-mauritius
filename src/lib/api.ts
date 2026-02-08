// API client for MySQL database operations via PHP backend on A2hosting
// IMPORTANT: Update API_BASE_URL with your actual domain

const API_BASE_URL = 'https://sunbox-mauritius.com/api';
// const API_BASE_URL = 'http://localhost/sunbox/api';

export const api = {
  /* =====================================================
     GENERIC
  ===================================================== */
  async query(action: string, data: Record<string, any> = {}) {
    const response = await fetch(`${API_BASE_URL}/index.php?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'API request failed');
    }
    return result.data !== undefined ? result.data : result;
  },

  /* =====================================================
     DASHBOARD
  ===================================================== */
  getDashboardStats() {
    return this.query('get_dashboard_stats');
  },

  /* =====================================================
     MODELS (DB-DRIVEN ONLY)
  ===================================================== */
  getModels(type?: 'container' | 'pool', activeOnly: boolean = true) {
    return this.query('get_models', { type, active_only: activeOnly });
  },

  createModel(model: {
    name: string;
    type: 'container' | 'pool';
    description?: string;
    base_price: number;
    surface_m2: number;
    bedrooms?: number;
    bathrooms?: number;
    container_20ft_count?: number;
    container_40ft_count?: number;
    pool_shape?: string;
    has_overflow?: boolean;
    image_url?: string;
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('create_model', model);
  },

  updateModel(model: {
    id: number;
    name?: string;
    type?: 'container' | 'pool';
    description?: string;
    base_price?: number;
    surface_m2?: number;
    bedrooms?: number;
    bathrooms?: number;
    container_20ft_count?: number;
    container_40ft_count?: number;
    pool_shape?: string;
    has_overflow?: boolean;
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
    name: string;
    is_option?: boolean;
    display_order?: number;
    image_id?: number | null;
  }) {
    return this.query('create_boq_category', category);
  },

  updateBOQCategory(category: {
    id: number;
    name: string;
    is_option?: boolean;
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
    unit?: string;
    unit_cost_ht?: number;
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
    unit?: string;
    unit_cost_ht?: number;
    supplier_id?: number | null;
    margin_percent?: number;
    display_order?: number;
  }) {
    return this.query('update_boq_line', line);
  },

  deleteBOQLine(id: number) {
    return this.query('delete_boq_line', { id });
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

  /* =====================================================
     QUOTES
  ===================================================== */
  getQuotes() {
    return this.query('get_quotes');
  },

  getQuote(id: number) {
    return this.query('get_quote', { id });
  },

  createQuote(quote: {
    model_id: number;
    model_name: string;
    model_type: 'container' | 'pool';
    base_price: number;
    options_total: number;
    total_price: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address?: string;
    customer_message?: string;
    device_id?: string;
    selected_options?: Array<{ option_id: number; option_name: string; option_price: number }>;
  }) {
    return this.query('create_quote', quote);
  },

  updateQuoteStatus(id: number, status: 'pending' | 'approved' | 'rejected' | 'completed') {
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
};

export default api;
