/**
 * Elevate Media Invoice Portal - Main Application
 */

// Google Apps Script endpoints
const ENDPOINTS = {
  'invisible-arts': 'https://script.google.com/macros/s/AKfycbyXunWS9R16yK7H0WS1cMUNxvMdoWK403vHnHvut0kCmw7f4LpE5GHt466Ou2xb6-x4/exec',
  'touch-a-heart': 'https://script.google.com/macros/s/AKfycbxSsPa7iyNz1re27zsrXjOGOzieh1XaSBkozWH0igYfxIr-1Vg1QruqPnQqnNJpXPCw/exec'
};

// Client slug mapping (client name -> form page)
const CLIENT_FORMS = {
  'invisible arts': 'invoice.html',
  'touch a heart': 'touch-a-heart.html'
};

/**
 * App State
 */
const App = {
  clients: [],
  currentClient: null,
  isLoading: false
};

/**
 * DOM Utilities
 */
const DOM = {
  /**
   * Get element by ID
   */
  $(id) {
    return document.getElementById(id);
  },

  /**
   * Query selector
   */
  $$(selector) {
    return document.querySelector(selector);
  },

  /**
   * Query selector all
   */
  $$$(selector) {
    return document.querySelectorAll(selector);
  },

  /**
   * Show loading overlay
   */
  showLoading(message = 'Loading...') {
    let overlay = this.$('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-message">${message}</div>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.loading-message').textContent = message;
      overlay.classList.remove('hidden');
    }
  },

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = this.$('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  },

  /**
   * Show alert message
   */
  showAlert(type, title, message, containerId = 'alert-container') {
    const container = this.$(containerId);
    if (!container) return;

    const icons = {
      success: '&#10004;',
      error: '&#10006;',
      info: '&#8505;'
    };

    container.innerHTML = `
      <div class="alert alert-${type}">
        <span class="alert-icon">${icons[type] || ''}</span>
        <div class="alert-content">
          <div class="alert-title">${title}</div>
          ${message ? `<div class="alert-message">${message}</div>` : ''}
        </div>
      </div>
    `;

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        container.innerHTML = '';
      }, 5000);
    }
  },

  /**
   * Clear alerts
   */
  clearAlerts(containerId = 'alert-container') {
    const container = this.$(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
};

/**
 * Dashboard Functions
 */
const Dashboard = {
  async init() {
    try {
      DOM.showLoading('Loading clients...');
      App.clients = await SupabaseClient.getClients();
      this.render();
    } catch (error) {
      console.error('Failed to load clients:', error);
      DOM.showAlert('error', 'Error Loading Clients', error.message);
    } finally {
      DOM.hideLoading();
    }
  },

  render() {
    const recurringList = DOM.$('recurring-clients-list');
    if (!recurringList) return;

    const recurringClients = App.clients.filter(c => c.invoice_type === 'recurring');

    if (recurringClients.length === 0) {
      recurringList.innerHTML = `
        <div class="empty-state">
          <p>No recurring clients found.</p>
          <a href="clients/new.html" class="btn btn-primary btn-sm mt-2">Add Client</a>
        </div>
      `;
      return;
    }

    recurringList.innerHTML = recurringClients.map(client => {
      const formPage = this.getFormPage(client.name);
      return `
        <a href="recurring/${formPage}?client=${client.id}" class="client-item">
          <div class="client-info">
            <span class="client-name">${this.escapeHtml(client.name)}</span>
            <span class="client-meta">${this.escapeHtml(client.send_to_email || client.billing_email || 'No email')}</span>
          </div>
          <span class="client-arrow">&rarr;</span>
        </a>
      `;
    }).join('');
  },

  getFormPage(clientName) {
    const slug = clientName.toLowerCase().trim();
    return CLIENT_FORMS[slug] || 'invoice.html';
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

/**
 * Recurring Invoice Form Functions
 */
const RecurringInvoice = {
  expenseCount: 1,

  async init() {
    // Get client ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client');

    if (!clientId) {
      DOM.showAlert('error', 'Error', 'No client specified');
      return;
    }

    try {
      DOM.showLoading('Loading client...');
      App.currentClient = await SupabaseClient.getClient(clientId);

      if (!App.currentClient) {
        DOM.showAlert('error', 'Error', 'Client not found');
        return;
      }

      this.populateForm();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to load client:', error);
      DOM.showAlert('error', 'Error Loading Client', error.message);
    } finally {
      DOM.hideLoading();
    }
  },

  populateForm() {
    const client = App.currentClient;
    if (!client) return;

    // Update page title
    const titleEl = DOM.$('page-title');
    if (titleEl) {
      titleEl.textContent = `Invoice: ${client.name}`;
    }

    // Populate form fields
    const sendToInput = DOM.$('send-to');
    if (sendToInput) {
      sendToInput.value = client.send_to_email || client.billing_email || '';
    }

    // Set default hours
    const week1Input = DOM.$('week1-hours');
    const week2Input = DOM.$('week2-hours');
    if (week1Input) week1Input.value = '40';
    if (week2Input) week2Input.value = '40';
  },

  setupEventListeners() {
    // Form submission
    const form = DOM.$('invoice-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Add expense button
    const addExpenseBtn = DOM.$('add-expense-btn');
    if (addExpenseBtn) {
      addExpenseBtn.addEventListener('click', () => this.addExpenseRow());
    }
  },

  addExpenseRow() {
    this.expenseCount++;
    const container = DOM.$('expenses-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'expense-item';
    row.innerHTML = `
      <input type="text" class="form-input expense-description" placeholder="Description">
      <input type="number" class="form-input expense-amount" placeholder="0.00" step="0.01" min="0">
      <button type="button" class="btn btn-danger btn-icon remove-expense-btn" title="Remove">
        &times;
      </button>
    `;

    // Add remove handler
    row.querySelector('.remove-expense-btn').addEventListener('click', () => {
      row.remove();
    });

    container.appendChild(row);
  },

  getExpenses() {
    const container = DOM.$('expenses-container');
    if (!container) return [];

    const expenses = [];
    const items = container.querySelectorAll('.expense-item');

    items.forEach(item => {
      const description = item.querySelector('.expense-description')?.value?.trim() || '';
      const amount = parseFloat(item.querySelector('.expense-amount')?.value) || 0;

      if (description || amount > 0) {
        expenses.push({ description, amount });
      }
    });

    // Ensure at least one expense entry (even if empty)
    if (expenses.length === 0) {
      expenses.push({ description: '', amount: 0 });
    }

    return expenses;
  },

  async handleSubmit(e) {
    e.preventDefault();
    DOM.clearAlerts();

    const sendTo = DOM.$('send-to')?.value?.trim();
    const week1Hours = parseFloat(DOM.$('week1-hours')?.value) || 0;
    const week2Hours = parseFloat(DOM.$('week2-hours')?.value) || 0;
    const projectDescription = DOM.$('project-description')?.value?.trim() || '';

    // Validation
    if (!sendTo) {
      DOM.showAlert('error', 'Validation Error', 'Please enter an email address');
      return;
    }

    const payload = {
      week1Hours,
      week2Hours,
      projectDescription,
      sendTo,
      expenses: this.getExpenses()
    };

    console.log('Submitting Invisible Arts invoice:', payload);

    try {
      DOM.showLoading('Submitting invoice...');

      const endpoint = ENDPOINTS['invisible-arts'];

      // Use form submission approach for better Google Apps Script compatibility
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.text();
      console.log('Response:', result);

      DOM.showAlert('success', 'Invoice Submitted!',
        'The invoice has been generated and emailed. Check your inbox shortly.');

      // Reset form
      DOM.$('invoice-form')?.reset();
      DOM.$('week1-hours').value = '40';
      DOM.$('week2-hours').value = '40';

    } catch (error) {
      console.error('Failed to submit invoice:', error);
      DOM.showAlert('error', 'Submission Failed',
        'There was an error submitting the invoice. Please try again.');
    } finally {
      DOM.hideLoading();
    }
  }
};

/**
 * Touch A Heart Invoice Form Functions
 */
const TouchAHeartInvoice = {
  months: ['January', 'February', 'March', 'April', 'May', 'June',
           'July', 'August', 'September', 'October', 'November', 'December'],

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client');

    if (clientId) {
      try {
        DOM.showLoading('Loading client...');
        App.currentClient = await SupabaseClient.getClient(clientId);
      } catch (error) {
        console.error('Failed to load client:', error);
      } finally {
        DOM.hideLoading();
      }
    }

    this.populateForm();
    this.setupEventListeners();
  },

  populateForm() {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();

    // Invoice date (today)
    const invoiceDateInput = DOM.$('invoice-date');
    if (invoiceDateInput) {
      invoiceDateInput.value = now.toISOString().split('T')[0];
    }

    // Retainer for (next month)
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const retainerMonthSelect = DOM.$('retainer-month');
    const retainerYearInput = DOM.$('retainer-year');
    if (retainerMonthSelect) retainerMonthSelect.value = this.months[nextMonth];
    if (retainerYearInput) retainerYearInput.value = nextMonthYear;

    // Description
    this.updateDescription();

    // Send to email from client or default
    const sendToInput = DOM.$('send-to');
    if (sendToInput) {
      const defaultEmail = 'robin@touchahearthawaii.org, touchaheart@ap.ramp.com, support@upstreambookkeeping.com';
      sendToInput.value = App.currentClient?.send_to_email || defaultEmail;
    }
  },

  setupEventListeners() {
    const form = DOM.$('invoice-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Update description when retainer month/year changes
    const retainerMonth = DOM.$('retainer-month');
    const retainerYear = DOM.$('retainer-year');

    if (retainerMonth) {
      retainerMonth.addEventListener('change', () => this.updateDescription());
    }
    if (retainerYear) {
      retainerYear.addEventListener('change', () => this.updateDescription());
    }
  },

  updateDescription() {
    const retainerMonthSelect = DOM.$('retainer-month');
    const retainerYearInput = DOM.$('retainer-year');
    const descriptionTextarea = DOM.$('description');

    if (!retainerMonthSelect || !descriptionTextarea) return;

    const month = retainerMonthSelect.value;
    const year = retainerYearInput?.value || new Date().getFullYear();

    descriptionTextarea.value = `Monthly Retainer for the month of ${month}, ${year}

Projected Scope of Work:
• Post production for event videos
• On-going Consultations and Planning
• Workload rollover from previous month`;
  },

  async handleSubmit(e) {
    e.preventDefault();
    DOM.clearAlerts();

    const sendTo = DOM.$('send-to')?.value?.trim();
    const retainerMonth = DOM.$('retainer-month')?.value;
    const retainerYear = parseInt(DOM.$('retainer-year')?.value);
    const invoiceDate = DOM.$('invoice-date')?.value;
    const description = DOM.$('description')?.value?.trim();

    // Validation
    if (!sendTo) {
      DOM.showAlert('error', 'Validation Error', 'Please enter an email address');
      return;
    }

    // Calculate billing period (month before retainer month)
    const retainerMonthIndex = this.months.indexOf(retainerMonth);
    const billingMonthIndex = retainerMonthIndex === 0 ? 11 : retainerMonthIndex - 1;
    const billingMonth = this.months[billingMonthIndex];
    const billingYear = retainerMonthIndex === 0 ? retainerYear - 1 : retainerYear;

    const payload = {
      invoiceMonth: retainerMonth,
      invoiceYear: retainerYear,
      billingMonth,
      billingYear,
      submitDate: invoiceDate,
      description,
      sendTo
    };

    try {
      DOM.showLoading('Submitting invoice...');

      const endpoint = ENDPOINTS['touch-a-heart'];

      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      DOM.showAlert('success', 'Invoice Submitted!',
        'The invoice has been generated and emailed. Check your inbox shortly.');

    } catch (error) {
      console.error('Failed to submit invoice:', error);
      DOM.showAlert('error', 'Submission Failed',
        'There was an error submitting the invoice. Please try again.');
    } finally {
      DOM.hideLoading();
    }
  }
};

/**
 * New Client Form Functions
 */
const NewClient = {
  init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    const form = DOM.$('client-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    DOM.clearAlerts();

    // Gather form data
    const formData = {
      name: DOM.$('client-name')?.value?.trim(),
      billing_contact_name: DOM.$('billing-contact-name')?.value?.trim() || null,
      billing_email: DOM.$('billing-email')?.value?.trim() || null,
      billing_phone: DOM.$('billing-phone')?.value?.trim() || null,
      billing_address_line1: DOM.$('billing-address-line1')?.value?.trim() || null,
      billing_address_line2: DOM.$('billing-address-line2')?.value?.trim() || null,
      billing_city: DOM.$('billing-city')?.value?.trim() || null,
      billing_state: DOM.$('billing-state')?.value?.trim() || null,
      billing_zip: DOM.$('billing-zip')?.value?.trim() || null,
      send_to_name: DOM.$('send-to-name')?.value?.trim() || null,
      send_to_email: DOM.$('send-to-email')?.value?.trim() || null,
      default_rate: parseFloat(DOM.$('default-rate')?.value) || null,
      invoice_type: DOM.$('invoice-type')?.value || 'recurring',
      payment_terms: DOM.$('payment-terms')?.value?.trim() || null,
      notes: DOM.$('notes')?.value?.trim() || null
    };

    // Validation
    if (!formData.name) {
      DOM.showAlert('error', 'Validation Error', 'Client name is required');
      return;
    }

    try {
      DOM.showLoading('Saving client...');
      await SupabaseClient.createClient(formData);

      DOM.showAlert('success', 'Client Saved!', 'Redirecting to dashboard...');

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 1500);

    } catch (error) {
      console.error('Failed to save client:', error);
      DOM.showAlert('error', 'Save Failed', error.message);
    } finally {
      DOM.hideLoading();
    }
  }
};

/**
 * Page Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  // Determine which page we're on and initialize accordingly
  const path = window.location.pathname;

  if (path.endsWith('index.html') || path.endsWith('/')) {
    Dashboard.init();
  } else if (path.includes('/recurring/touch-a-heart')) {
    TouchAHeartInvoice.init();
  } else if (path.includes('/recurring/')) {
    RecurringInvoice.init();
  } else if (path.includes('/clients/new')) {
    NewClient.init();
  }
});
