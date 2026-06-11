# Payment Integration: PayPal & OPay

## Overview
Grantify now supports dual payment processors for sponsored listings monetization:
- **PayPal**: International payments (sandbox/production)
- **OPay**: Nigeria-specific payments (sandbox/production)

## Implementation Status

### ✅ Completed
1. **Backend Payment URL Generation** (`backend/handlers/sponsored.js`)
   - `POST ?action=create` endpoint now builds payment URLs for PayPal or OPay
   - NGN to USD conversion for PayPal (rough calculation: `amount / 100 / 800`)
   - Returns `{id, paymentUrl, amountCents}` to frontend

2. **Webhook Handler** (`backend/handlers/sponsored.js`)
   - `GET /api/sponsored/webhook?provider=paypal|opay&listingId={id}`
   - Auto-marks listing as paid, calculates start_at/end_at, sets invoice_number
   - Sets provider.is_recommended = TRUE when listing activated

3. **Frontend Payment Method Selection** (`pages/Sponsor.tsx`)
   - Radio buttons to choose PayPal or OPay
   - Payment method added to `payerInfo` sent to backend
   - Form state includes `paymentProvider: 'paypal'` (default)

4. **Trust Badges & Guarantee Copy** (`pages/Sponsor.tsx`)
   - New section: "Your investment is protected"
   - Badges: 256-bit SSL, 14-Day Guarantee, 50+ Partners
   - Displays above FAQ with icons (Lock, RefreshCw, CheckCircle)

5. **Environment Variables** (`.env`)
   ```
   # PayPal (Sandbox or Live)
   PAYPAL_MODE=sandbox
   PAYPAL_EMAIL=sponsor@grantify.help
   PAYPAL_MERCHANT_ID=
   PAYPAL_CLIENT_ID=
   PAYPAL_CLIENT_SECRET=
   
   # OPay (Nigeria payment processor)
   OPAY_MODE=sandbox
   OPAY_MERCHANT_ID=
   OPAY_SECRET_KEY=
   OPAY_PUBLIC_KEY=
   ```

### 📋 Pending Configuration

#### Step 1: PayPal Setup (Sandbox)
1. Visit https://developer.paypal.com
2. Create a Business Account or use existing
3. Navigate to Dashboard → Sandbox → Merchant
4. Copy credentials:
   - `PAYPAL_EMAIL`: Merchant email (e.g., business-xxxxx@business.example.com)
   - `PAYPAL_MERCHANT_ID`: Merchant ID
5. Update `.env`:
   ```
   PAYPAL_EMAIL=your-sandbox-email@business.example.com
   PAYPAL_MODE=sandbox
   ```
6. For advanced IPN handling, add to PayPal dashboard: Account → Notification preferences
   - IPN endpoint: `https://grantify.help/api/sponsored/webhook?provider=paypal`

#### Step 2: OPay Setup (Sandbox)
1. Visit https://opaycheckout.com (OPay developer portal)
2. Register merchant account
3. Obtain credentials:
   - `OPAY_MERCHANT_ID`: Your merchant ID
   - `OPAY_PUBLIC_KEY`: Public key for frontend
   - `OPAY_SECRET_KEY`: Secret key for backend
4. Update `.env`:
   ```
   OPAY_MODE=sandbox
   OPAY_MERCHANT_ID=your-sandbox-merchant-id
   OPAY_SECRET_KEY=your-secret-key
   OPAY_PUBLIC_KEY=your-public-key
   ```
5. Configure return URL in OPay dashboard: `https://grantify.help/api/sponsored/webhook?provider=opay`

### 🚀 How It Works

#### User Flow (Sponsor Page)
1. User fills sponsor booking form:
   - Select provider (loan provider to feature)
   - Select tier (package: Basic/Standard/Premium)
   - Enter contact info (name, email, company, website)
   - Select payment method (PayPal or OPay)
   - Click "Launch Sponsorship"

2. Form submission:
   ```typescript
   const payerInfo = {
     name, email, company, website, note,
     placement: 'sponsor-page',
     paymentProvider: 'paypal' // or 'opay'
   };
   const result = await ApiService.createSponsoredPurchase(providerId, tierId, payerInfo);
   ```

3. Backend creates `sponsored_listings` record (status: pending)
4. Backend builds payment URL:
   - **PayPal**: `https://sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick&business=...&amount=XXX&...`
   - **OPay**: `https://sandbox.opaycheckout.com/checkout?merchantId=...&amount=...&...`

5. Frontend opens payment URL in new tab:
   ```typescript
   if (result.paymentUrl) {
     window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
   }
   ```

#### Payment Return Flow
1. User completes payment on PayPal or OPay
2. Payment processor redirects to: `https://grantify.help/api/sponsored/webhook?provider=paypal|opay&listingId={id}`
3. Webhook handler:
   - Marks listing as `payment_status = 'paid'`
   - Calculates `start_at = NOW()` and `end_at = NOW() + {tier.duration_days}`
   - Generates invoice number: `INV-YYYYMMDD-{id}`
   - Sets `provider.is_recommended = TRUE`

#### Admin Manual Override
If payment auto-marking fails, admin can manually approve:
- Navigate to Admin → Sponsored tab
- Click "Mark Paid" on pending listing
- Confirm activation (same logic as webhook)

### 🛠️ Testing Checklist

#### Local Setup
```bash
# 1. Update .env with sandbox credentials
PAYPAL_EMAIL=your-sandbox-merchant@business.example.com
PAYPAL_MODE=sandbox
OPAY_MODE=sandbox
OPAY_MERCHANT_ID=your-merchant-id
OPAY_SECRET_KEY=your-secret-key

# 2. Install dependencies (if not already)
npm install

# 3. Start local dev server
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

#### Manual Testing (Sandbox)
1. **PayPal Flow**
   - Visit http://localhost:5173/sponsor
   - Fill form (provider, package, contact info)
   - Select "PayPal (International)"
   - Click "Launch Sponsorship"
   - Payment window opens → PayPal sandbox
   - Use test credentials: `sb-xxxxx@business.example.com` / password
   - Complete payment
   - Redirect to webhook → listing marked paid
   - Verify in Admin → Sponsored tab

2. **OPay Flow**
   - Same steps as above
   - Select "OPay (Nigeria)" instead
   - Complete payment in OPay sandbox
   - Redirect to webhook → listing marked paid

3. **Admin Manual Override (if webhook fails)**
   - Go to Admin → Sponsored tab
   - Click "Mark Paid" on pending listing
   - Confirm → listing status changes to paid
   - Verify start_at/end_at calculated correctly

#### Database Verification
```sql
-- Check sponsored listing
SELECT id, payment_status, start_at, end_at, invoice_number 
FROM sponsored_listings 
WHERE id = {listing_id};

-- Verify provider marked as recommended
SELECT id, name, is_recommended 
FROM loan_providers 
WHERE id = {provider_id};
```

### 📊 Production Deployment

#### Before Going Live
1. **Switch to PayPal Live**
   ```
   PAYPAL_MODE=live
   PAYPAL_EMAIL={your-live-merchant-email}
   ```

2. **Switch to OPay Live**
   ```
   OPAY_MODE=live
   OPAY_MERCHANT_ID={your-live-merchant-id}
   OPAY_SECRET_KEY={your-live-secret-key}
   ```

3. **Update Return URLs**
   - PayPal Dashboard: Account → Notification preferences
   - OPay Dashboard: Merchant settings
   - Both should point to: `https://grantify.help/api/sponsored/webhook`

4. **Test with Live (small amount)**
   - Create test booking with $1-$5 USD via PayPal
   - Verify listing auto-activates in production DB
   - Check invoice email sends correctly

5. **Monitor Payments**
   - PayPal: https://www.paypal.com/businessmanage/transactions
   - OPay: Merchant dashboard → Transaction history

### 🐛 Troubleshooting

#### Issue: Payment URL returns null
- Check `.env` has correct `PAYPAL_EMAIL` or `OPAY_MERCHANT_ID`
- Check backend logs for errors in URL building
- Verify `paymentProvider` is set in form

#### Issue: Webhook not triggering
- **PayPal**: Ensure IPN is configured in sandbox account
- **OPay**: Verify return URL in merchant dashboard matches code
- Both: Check logs at `/api/sponsored/webhook` endpoint for 404/500 errors

#### Issue: Listing not marked paid after payment
- Check `sponsored_listings` table: `payment_status` should be 'paid'
- If still 'pending', manually click "Mark Paid" in Admin
- Check webhook logs for SQL errors

#### Issue: Invoice number not generated
- Verify `invoice_issued_at`, `invoice_due_date` nullable columns exist
- Check backend SQL query syntax
- Manually update via Admin → Invoice modal if needed

### 📝 Code Locations

- **Backend Handler**: `backend/handlers/sponsored.js`
  - Lines ~95-130: Payment URL generation (create action)
  - Lines ~415-445: Webhook handler

- **Frontend Form**: `pages/Sponsor.tsx`
  - Lines ~25-32: Form state with `paymentProvider`
  - Lines ~85-95: Payment method radio buttons
  - Lines ~125-135: Trust badges section
  - Lines ~60-65: Payment method sent to API

- **API Client**: `services/storage.ts`
  - `createSponsoredPurchase(providerId, tierId, payerInfo)`: Sends form to backend

- **Config**: `.env`
  - PayPal keys at lines ~XXX
  - OPay keys at lines ~XXX

### 🔗 External Resources
- PayPal Docs: https://developer.paypal.com/docs/checkout/integrate/
- OPay Docs: https://opaycheckout.com/docs
- Grantify API: http://localhost:3001/api/sponsored
- Admin Dashboard: http://localhost:5173/admin#sponsored

### ✨ What's Next
- Monitor production payment conversions
- Gather advertiser feedback on payment UX
- Consider adding more payment providers (Stripe, Remita)
- Implement payment reconciliation reports
