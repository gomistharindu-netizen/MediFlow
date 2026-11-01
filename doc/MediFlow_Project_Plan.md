# MediFlow

## Clinic and Patient Management System

- **Product name:** MediFlow
- **Name meaning:** Medical + Workflow
- **Brand:** MediFlow by TM Digital Solution
- **Prepared by:** TM Digital Solution
- **Personal website:** https://tmgomis.online
- **Date:** 14 October 2026
- **Document language:** English
- **Status:** Agreed scope baseline for proposal and implementation planning

## 1. Purpose

MediFlow connects registration, appointments, clinic check-in, patient queues, medical records, lab results, prescriptions, optional pharmacy operations and billing.

The first client is a general practice with approximately 60 patients per day. Visiting specialists, staff roles and clinic settings are configurable. Patients do not need to install a mobile application.

This document describes the proposed system; it does not claim that a production clinic system has been implemented. The existing website is an illustrative client proposal.

## 2. Delivery and commercial decisions

- Design the product for separate clinic accounts and isolated patient data.
- Configure doctor sessions, users, permissions, fees and optional modules during onboarding.
- Full offline operation is deferred. The first release requires internet access.
- A SaaS subscription model was initially proposed.
- A one-time software/license fee with client-paid hosting was subsequently discussed. Rs. 250,000 was a proposed amount, not a confirmed quotation.
- The final commercial model, software price and delivery period remain open.
- Hosting, domain, messaging usage, hardware and support responsibilities must be itemized separately.
- Source-code delivery, exclusive ownership, license limits and the right to reuse the product must be agreed explicitly.

## 3. First release modules

| Module | Scope |
|---|---|
| Clinic setup | Branding, doctors, sessions, capacity, staff, permissions and fee settings |
| Patient registration | Permanent patient ID, demographic details, guardian/family relationships and duplicate checks |
| Bookings | Reception-entered phone bookings, walk-ins, cancellation and rescheduling; optional WhatsApp bot |
| Check-in | Appointment QR validation, assisted lookup and kiosk/reception attendance confirmation |
| Queue | Doctor/session queue, call, recall, skip, cancellation, completion and authorized priority changes |
| Patient communication | Default SMS confirmation links, appointment reminders and selected turn alerts |
| Patient pages | Private appointment details, QR and automatically updating queue position |
| Clinical records | Visit history, allergies, conditions, measurements, diagnosis, notes and prescriptions |
| Lab results | Report upload, patient/visit linking, report details and doctor review |
| Optional pharmacy | Dispensing, purchases, suppliers, batches, expiry, stock controls and returns |
| Billing | Separate consultation and pharmacy invoices, payments, receipts and balances |
| Reports | Visits, queue activity, collections, pharmacy sales, stock movement and expiry |
| Controls | Clinic isolation, access permissions, audit history, protected files and backups |

## 4. Main use case

1. **Register or find the patient.** Reception checks for an existing profile. New patients receive a permanent patient ID; returning patients keep their existing ID.
2. **Create the booking or walk-in token.** Choose the doctor and session, check capacity and allocate a booking reference and session token.
3. **Send the SMS link.** The private appointment page contains details, the appointment QR and live queue access. Opening it does not check the patient in.
4. **Confirm arrival.** Reception or the clinic kiosk validates the QR and records check-in. Without a QR, staff find and verify the correct record. Repeated scans do not duplicate visits.
5. **Apply the consultation payment setting.** Collect before consultation if configured; otherwise collect during final billing.
6. **Call and consult.** Staff apply the queue rules. The doctor reviews history and available lab results, records the consultation and issues a prescription.
7. **Add and review lab results when available.** Authorized staff upload reports; the doctor reviews them. Results may arrive during the visit or later.
8. **Supply medicines when applicable.** An in-house pharmacy records actual quantities and batches dispensed. Otherwise, the patient receives a prescription for an external pharmacy.
9. **Complete billing and the visit.** Record consultation and pharmacy payments separately, avoid charging an already-paid fee again, and retain any outstanding balance.
10. **Support the next visit.** Provide a digital or printed permanent patient card. Scan it or search for the existing patient before creating a new visit.

## 5. Patient identity and QR rules

- Permanent patient ID, appointment reference, visit ID and queue token are separate identifiers.
- Create the permanent patient ID at first registration, not after medicine collection.
- One contact number can support several distinct family patient records; a phone number alone is not a unique patient identifier.
- Appointment QR codes are valid for their booking/session and are invalid after cancellation.
- Confirm attendance using a clinic scanner, kiosk or authorized staff action.
- Permanent patient QR codes identify the existing profile for future visits. They do not expose medical information or replace staff authentication.
- Without a card, authorized staff search by patient ID, name, phone and date of birth and verify the match.
- Patients without phones use assisted registration, printed tokens/cards and the waiting-area display.

## 6. Queue priority

Default: preserve booking order among checked-in patients whose turn has not been missed. Booking number and current position are displayed separately.

| Scenario | Default outcome |
|---|---|
| 24 checks in first; 16 checks in before 16's turn passes | 16 receives the earlier waiting position |
| 24 is already called or in consultation when 16 arrives | 24 continues without interruption |
| 16 was absent when the turn was reached and marked missed | 16 joins after patients already checked in and waiting; the original booking number remains 16 |
| Clinically urgent patient | Authorized staff can change priority and record the reason |

Confirm recall, grace periods, walk-in allocation and late-arrival handling during onboarding. Queues belong to the appropriate doctor/session. Duplicate requests must not allocate duplicate tokens.

## 7. SMS default and optional WhatsApp

| Feature | Default |
|---|---|
| WhatsApp booking bot | Off; enable only when requested by the clinic |
| Booking confirmation | SMS |
| Appointment QR and live queue link | SMS linking to the private appointment page |
| Appointment reminders | SMS |
| Turn-approaching alerts | SMS |
| Continuous queue progress | Automatic web-page updates |

Enabling WhatsApp booking does not change the default notification channel. The optional bot guides doctor/session selection and supports booking, cancellation, rescheduling and a staff contact route.

- Configure reminder timing and turn-alert thresholds.
- Avoid sending an SMS or WhatsApp message for every queue change.
- Track notification attempts and delivery status; prevent duplicate sends.
- Cancel obsolete reminders after cancellation or rescheduling.
- Before check-in, the patient page says attendance has not yet been confirmed.
- An unread or undelivered message does not pause the queue.
- Show the last update time and connection status when live updates stop.
- Obtain appropriate communication permissions and keep medical report contents out of ordinary SMS and public queue pages.
- Messaging fees depend on provider, message category and SMS segments. Earlier estimates are illustrative and are not fixed rates in this plan.

## 8. Medical records and prescriptions

- Maintain a separate clinical record for each visit without overwriting previous history.
- Include complaints, diagnosis, notes, allergies, ongoing conditions and relevant measurements.
- Record prescription medicine, strength, dose, frequency, duration and instructions.
- Provide a printable prescription.
- Track who made clinical entries and corrections and when.
- Prescribed medicines and actually dispensed medicines are distinct records.
- Clinical decisions, prescriptions and interpretation of results remain with the treating doctor.

## 9. Lab results

Manual report upload and review are included in the first release.

- Upload PDF, JPG or PNG reports, including scans of paper reports.
- Link each report to the correct patient and relevant visit.
- Record test name, report date, laboratory, uploader and upload time.
- Track **Pending -> Received -> Reviewed** states, with doctor review notes when applicable.
- Make previous and current reports accessible to authorized doctors.
- Link reports arriving later to the original visit or an appropriate follow-up.
- A pending report does not prevent visit completion.
- Restrict report access independently of ordinary queue visibility.
- Do not expose reports through public displays, queue links or patient QR cards.

Automatic integration with an external laboratory system is separately scoped for a future phase. Automated interpretation and OCR extraction are not part of the agreed first-release scope.

## 10. Optional pharmacy

### Pharmacy disabled

Issue a prescription for an external pharmacy. Keep prescribed-medicine history without claiming that the external pharmacy dispensed the medicine.

### Pharmacy enabled

- Medicine catalogue, stock units, suppliers, purchases and stock receipts.
- Batch numbers, expiry dates and purchase/selling prices.
- Actual quantities and batches dispensed, including partial supplies.
- Reduce stock on actual issue, not on prescription creation.
- Prefer the earliest-expiring usable batch; block expired and insufficient stock.
- Low-stock and near-expiry alerts.
- Stock counts, authorized adjustments, returns and traceable stock movement.
- A separate pharmacy invoice linked to the same visit.

## 11. Billing settings

- Choose consultation payment **Before** or **After** during clinic onboarding.
- Authorized administrators can change settings for new visits without rewriting issued bills.
- Consultation fees can vary by doctor and, where required, session.
- Keep consultation and pharmacy invoices separate but linked to one patient visit.
- Show combined charges, payments and balances in the visit summary.
- Consultation status, dispensing status and payment status remain independent.
- Record payment methods, receipts, outstanding amounts and authorized refunds/voids.
- Avoid duplicate consultation charges and retain invoice/payment history.
- A pharmacy return must not rewrite the consultation invoice.

## 12. Roles and protection

| Role | Responsibilities |
|---|---|
| Reception | Registration, bookings, check-in, queues and authorized payment tasks |
| Doctor | Authorized patient history, lab review, consultations and prescriptions |
| Pharmacy staff | Necessary dispensing details, pharmacy stock and pharmacy billing |
| Cashier | Authorized invoices, payments, receipts and balance checks |
| Clinic administrator | Clinic settings, staff permissions and authorized reports |
| Platform administrator | Clinic provisioning and technical operations; clinical access only through an authorized, logged support process |

Users may hold multiple roles. Enforce permissions for APIs, reports, exports and files, not only screen visibility. Keep clinic records isolated and retain audit history. Agree backup frequency, retention, restore targets, data export and support coverage before launch.

## 13. Delivery and acceptance

Discovery and design -> Build and configure -> Test and train -> Controlled pilot -> Launch and agreed support.

Acceptance includes:

- Correct new/returning patient identification and family bookings.
- Booking capacity and duplicate prevention.
- QR validity, cancellation and repeated scans.
- The 16/24 queue scenarios and late-arrival handling.
- Optional WhatsApp without changing SMS defaults.
- Report upload, patient/visit linking and lab access permissions.
- Preserved clinical history and prescriptions.
- Partial dispensing, batch/expiry checks and stock movements.
- Separate invoices and before/after consultation payment.
- Clinic data isolation and backup restoration.

## 14. Later phases and open decisions

Later phases: full offline operation, automatic lab integrations, authenticated patient medical-record portal, additional branch workflows, online payments and native mobile apps where separately agreed.

Before implementation, confirm required fields, doctor/session counts, languages, print layouts, device compatibility, provider accounts, storage limits, data migration scope, support responsibilities and final commercial terms. The agreed baseline technical architecture is a Decoupled Stack (Next.js Frontend + Laravel 11 API / Supabase PostgreSQL Backend with Realtime Queue updates). Detailed technical specifications, database schemas, and low-cost deployment plans (~LKR 1,500/mo) are documented in [MediFlow Technical Architecture](MediFlow_Technical_Architecture.md).

## 15. Proposal references

- Interactive proposal: https://tm-clinic-proposal.brownloom16.chatgpt.site
- The proposal website is an illustrative presentation and is currently private.
- Earlier document outputs: TM_Digital_Solution_Clinic_Proposal.docx and TM_Digital_Solution_Clinic_Proposal.pdf.
- Those earlier document outputs predate the expanded lab-result/use-case website changes and should be revised before being treated as the complete current scope.

**Confirmed product branding: MediFlow by TM Digital Solution.**

## 16. Brand color ideas

The following palettes are design options for MediFlow. **Clinical Teal is the recommended direction; the final palette has not yet been selected.**

| Palette | Primary | Secondary | Background | Accent |
|---|---|---|---|---|
| Clinical Teal | Teal `#0F766E` | Navy `#16324F` | Soft White `#F4F9F8` | Mint `#CCFBF1` |
| Medical Blue | Blue `#2563EB` | Navy `#142D4E` | Ice White `#F5F8FC` | Sky Blue `#BAE6FD` |
| Sage Care | Forest Green `#245747` | Sage `#789582` | Warm White `#F7F6F0` | Pale Green `#E3EDDF` |
| Modern Indigo | Indigo `#4F46E5` | Slate `#1E293B` | Cool White `#F8FAFC` | Teal `#14B8A6` |

### Recommended Clinical Teal usage

| Interface element | Color |
|---|---|
| Logo and primary buttons | Teal `#0F766E` |
| Headings and navigation | Navy `#16324F` |
| Page background | Soft White `#F4F9F8` |
| Selected items and subtle highlights | Mint `#CCFBF1` |
| Body text | Dark Slate `#243746` |

Aim for a clean, calm and professional visual identity. Sage Care is an alternative that continues the existing proposal webpage's green and cream direction.

During interface implementation, check text and control contrast for actual foreground/background pairs. Communicate statuses through text or icons as well as color.
