Act as an expert Python/Flask developer and UI/UX engineer. The user has done QA testing and found several UI/UX workflows that are incomplete or broken.

Please execute the following Implementation Plan (Phase F) step-by-step to fix these logical gaps. Proceed ONE STEP at a time and ask for confirmation.

### IMPLEMENTATION PLAN

#### STEP 1: Fix Tenant Dashboard API & Payment UX (`app.py`, `templates/dashboard_tenant.html`, `static/js/app.js`)
- **Goal:** The tenant dashboard must know if the rent is already paid or pending, disable the pay button accordingly, update the due date, and fix the History link.
- **Actions:**
  1. **`app.py`**: In `dashboard_loc()`, query the `Paiement` table to see if a payment exists for the `current_user_id` for the *current month and year*. Add a new field `payment_status` to the JSON response (values: `'none'`, `'en_attente'`, or `'paye'`).
  2. **`dashboard_tenant.html`**: 
     - Wrap the "Historique des Paiements" div inside an `<a href="/paiements" class="...">` tag so it's clickable.
     - Add an ID to the payment badge: `id="tenant-payment-badge"`.
  3. **`app.js`**: In the `/dashboard-locataire` logic:
     - If `data.payment_status === 'paye'`, change the badge to green ("Réglé"), hide the `pay-now-btn`, and set `dueDateEl.textContent` to "Prochaine échéance : 05 du mois prochain".
     - If `data.payment_status === 'en_attente'`, change the badge to yellow ("En attente"), disable the `pay-now-btn`, and change its text to "En attente de validation".
     - If `'none'`, keep it orange ("À payer") and the button active.

#### STEP 2: Fix "Mon Contrat" Tenant View (`templates/contrat.html`, `static/js/app.js`)
- **Goal:** Tenants must NOT see the contract creation form. They should only see a read-only view of their contract.
- **Actions:**
  1. **`contrat.html`**: Wrap the forms (Property select, Tenant select, Quick Tenant Form, and Create button) inside a `<div id="owner-contract-controls" class="hidden">`.
  2. **`app.js`**: In the `/contrat` route logic, check `const myRole = localStorage.getItem('user_role');`.
     - If `myRole === 'proprietaire'`, remove the `hidden` class from `owner-contract-controls`.
     - If `myRole === 'locataire'`, keep the controls hidden. The existing `loadContracts()` function already lists the contracts nicely; it will just show the tenant's own contract card natively.

#### STEP 3: Fix Messaging & Maintenance Requests (`static/js/app.js`)
- **Goal:** The maintenance request must send to the correct owner ID, and the tenant's chat should auto-select their owner.
- **Actions:**
  1. **`app.js` (Maintenance Form)**: Inside the `maintenanceForm.addEventListener`, before doing the `POST /api/messages`, `fetch('/api/messages/contacts')` first. Get the first contact's ID (`contacts[0].id`) and use it as the `receiver_id` instead of the hardcoded `1`.
  2. **`app.js` (Messages page)**: Inside `loadContacts()`, if `localStorage.getItem('user_role') === 'locataire'` and `contacts.length > 0`, automatically set `currentContactId = contacts[0].id` and call `loadMessages(currentContactId)`. This prevents the tenant from seeing a blank screen.

#### STEP 4: Restore Owner Alerts UI (`templates/dashboard_owner.html`)
- **Goal:** The owner's dashboard is missing the HTML container to display alerts and interventions.
- **Actions:**
  1. **`dashboard_owner.html`**: Right below the "Accès Rapides" section, add a new section for alerts:
  ```html
  <div class="px-4 pt-6">
      <h2 class="text-[20px] font-bold leading-tight text-[#111418] dark:text-gray-100 pb-3">Alertes & Notifications</h2>
      <div id="owner-alerts-list" class="flex flex-col gap-2">
          </div>
  </div>