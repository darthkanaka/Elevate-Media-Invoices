/**
 * Client list for the Elevate Media invoice portal.
 *
 * This replaced a Supabase project (Elevate Media Finances, ref
 * lmuhkvjjougawkcfznrn) on 2026-09-23. That project held one table with these
 * two rows and nothing else, and cost $10 a month to keep an address book. The
 * invoices themselves were always produced by the Apps Script endpoints in
 * app.js; this file only supplies the client details the pages read.
 *
 * To add or change a client permanently, edit CLIENTS below and push.
 *
 * Clients added through the portal's own New Client form are kept in this
 * browser's localStorage and merged in, so the form still works, but they only
 * exist on the machine they were added from. Copy them into CLIENTS to keep
 * them for good.
 *
 * The method names and return shapes match the old Supabase REST client, which
 * is why app.js needed no changes. SupabaseClient is kept as an alias for that
 * reason only.
 */
const CLIENTS = [
  {
    "id": "ace33a73-cdda-4a87-a531-533e19c42919",
    "name": "Invisible Arts, LLC",
    "billing_contact_name": "Christopher Mapes",
    "send_to_email": "nick@invizarts.com",
    "billing_phone": "(310) 428-8324",
    "default_rate": 45.0,
    "invoice_type": "recurring",
    "payment_terms": "Due upon receipt",
    "notes": "Bi-weekly invoices via Veex Photo LLC. Nick approves, forwards to Chris.",
    "created_at": "2025-12-14T05:43:38.003805Z",
    "updated_at": "2025-12-14T05:43:38.003805Z",
    "billing_email": "cmapes@invizarts.com",
    "billing_address_line1": null,
    "billing_address_line2": null,
    "billing_city": null,
    "billing_state": null,
    "billing_zip": null,
    "send_to_name": "Nick"
  },
  {
    "id": "9f11515f-a1b3-487d-946d-9c8be5c11da9",
    "name": "Touch A Heart",
    "billing_contact_name": "Robin Kumabe",
    "send_to_email": "robin@touchahearthawaii.org, touchaheart@ap.ramp.com, support@upstreambookkeeping.com",
    "billing_phone": "(808) 779-7083",
    "default_rate": 2500.0,
    "invoice_type": "recurring",
    "payment_terms": "Due upon receipt",
    "notes": "Monthly retainer. Invoice 5 days before end of month. Invoice prefix: TAH. Tax: 4.71%",
    "created_at": "2025-12-14T05:57:00.605311Z",
    "updated_at": "2025-12-14T05:57:00.605311Z",
    "billing_email": "robin@touchahearthawaii.org",
    "billing_address_line1": null,
    "billing_address_line2": null,
    "billing_city": null,
    "billing_state": null,
    "billing_zip": null,
    "send_to_name": "Robin Kumabe"
  }
];

const LOCAL_KEY = 'elevate-invoices-local-clients';

const ClientStore = {
  _local() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
    catch (e) { return []; }
  },
  _saveLocal(list) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) {}
  },
  _all() {
    return CLIENTS.concat(this._local()).map(c => ({ ...c }));
  },

  async getClients(filters = {}) {
    let list = this._all();
    if (filters.invoice_type) list = list.filter(c => c.invoice_type === filters.invoice_type);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getClient(id) {
    return this._all().find(c => c.id === id) || null;
  },

  async createClient(clientData) {
    const now = new Date().toISOString();
    const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
    const client = { ...clientData, id, created_at: now, updated_at: now };
    this._saveLocal(this._local().concat(client));
    return client;
  },

  async updateClient(id, clientData) {
    const local = this._local();
    const i = local.findIndex(c => c.id === id);
    if (i === -1) throw new Error('Built-in clients are edited in js/clients.js, not from the portal.');
    local[i] = { ...local[i], ...clientData, updated_at: new Date().toISOString() };
    this._saveLocal(local);
    return local[i];
  },

  async deleteClient(id) {
    const local = this._local();
    if (!local.some(c => c.id === id)) throw new Error('Built-in clients are removed in js/clients.js, not from the portal.');
    this._saveLocal(local.filter(c => c.id !== id));
    return null;
  }
};

const SupabaseClient = ClientStore;
