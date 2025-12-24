// API client for MySQL database operations via PHP backend on A2hosting
// IMPORTANT: Update API_BASE_URL with your actual domain

// Change this to your A2hosting domain
const API_BASE_URL = 'https://sunbox-mauritius.com/api';
// For local development, you can use:
// const API_BASE_URL = 'http://localhost/sunbox/api';

export const api = {
  // Generic query function
  async query(action: string, data: Record<string, any> = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/index.php?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'API request failed');
      }
      
      return result.data !== undefined ? result.data : result;
    } catch (error) {
      console.error(`API Error (${action}):`, error);
      throw error;
    }
  },

  // Dashboard
  async getDashboardStats() {
    return this.query('get_dashboard_stats');
  },

  // Quotes
  async getQuotes(status?: string) {
    return this.query('get_quotes', status ? { status } : {});
  },

  async getQuote(id: number) {
    return this.query('get_quote', { id });
  },

  async createQuote(quoteData: {
    model_id?: number;
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
    options?: Array<{ id?: number; name: string; price: number }>;
  }) {
    return this.query('create_quote', quoteData);
  },

  async updateQuoteStatus(id: number, status: 'pending' | 'approved' | 'rejected' | 'completed') {
    return this.query('update_quote_status', { id, status });
  },

  async deleteQuote(id: number) {
    return this.query('delete_quote', { id });
  },

  // Models
  async getModels(type?: 'container' | 'pool', activeOnly: boolean = true) {
    return this.query('get_models', { type, active_only: activeOnly });
  },

  async createModel(model: {
    name: string;
    type: 'container' | 'pool';
    description?: string;
    base_price: number;
    dimensions?: string;
    bedrooms?: number;
    bathrooms?: number;
    image_url?: string;
    features?: string[];
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('create_model', model);
  },

  async updateModel(model: {
    id: number;
    name?: string;
    type?: 'container' | 'pool';
    description?: string;
    base_price?: number;
    dimensions?: string;
    bedrooms?: number;
    bathrooms?: number;
    image_url?: string;
    features?: string[];
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('update_model', model);
  },

  async deleteModel(id: number) {
    return this.query('delete_model', { id });
  },

  // Options
  async getOptions(productType?: 'container' | 'pool', category?: string) {
    return this.query('get_options', { product_type: productType, category });
  },

  async getOptionCategories() {
    return this.query('get_option_categories');
  },

  async createOption(option: {
    name: string;
    category: string;
    price: number;
    description?: string;
    product_type?: 'container' | 'pool' | 'both';
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('create_option', option);
  },

  async updateOption(option: {
    id: number;
    name?: string;
    category?: string;
    price?: number;
    description?: string;
    product_type?: 'container' | 'pool' | 'both';
    is_active?: boolean;
    display_order?: number;
  }) {
    return this.query('update_option', option);
  },

  async deleteOption(id: number) {
    return this.query('delete_option', { id });
  },

  // Settings
  async getSettings(group?: string) {
    return this.query('get_settings', group ? { group } : {});
  },

  async updateSetting(key: string, value: string, group?: string) {
    return this.query('update_setting', { key, value, group });
  },

  async updateSettingsBulk(settings: Array<{ key: string; value: string; group?: string }>) {
    return this.query('update_settings_bulk', { settings });
  },

  // Contacts
  async getContacts(status?: string) {
    return this.query('get_contacts', status ? { status } : {});
  },

  async createContact(contact: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }) {
    return this.query('create_contact', contact);
  },

  async updateContactStatus(id: number, status: 'new' | 'read' | 'replied' | 'archived') {
    return this.query('update_contact_status', { id, status });
  },

  // Email Templates
  async getEmailTemplates() {
    return this.query('get_email_templates');
  },

  async updateEmailTemplate(templateKey: string, subject: string, bodyHtml: string, bodyText?: string) {
    return this.query('update_email_template', {
      template_key: templateKey,
      subject,
      body_html: bodyHtml,
      body_text: bodyText
    });
  },

  // Activity Logs
  async getActivityLogs(limit: number = 50) {
    return this.query('get_activity_logs', { limit });
  },

  // Email sending
  async sendEmail(data: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string | string[];
  }) {
    const response = await fetch(`${API_BASE_URL}/email.php?action=send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Email sending failed');
    }
    
    return result;
  },

  async sendTemplateEmail(data: {
    to: string | string[];
    template_key: string;
    data: Record<string, any>;
    cc?: string | string[];
  }) {
    const response = await fetch(`${API_BASE_URL}/email.php?action=send_template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Email sending failed');
    }
    
    return result;
  },

  // Test email configuration
  async testEmailConfig(to: string) {
    const response = await fetch(`${API_BASE_URL}/email.php?action=test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to }),
    });
    
    const result = await response.json();
    
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Test email failed');
    }
    
    return result;
  },

  // Get email logs
  async getEmailLogs(limit: number = 50) {
    const response = await fetch(`${API_BASE_URL}/email.php?action=get_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit }),
    });
    
    const result = await response.json();
    
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to get email logs');
    }
    
    return result.data;
  },
};

export default api;
