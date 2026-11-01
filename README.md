# MediFlow - Smart Clinic & Hospital Management System (Sri Lanka)

MediFlow is a multi-tenant Clinical Management & Outpatient Consultation EMR designed specifically for outpatient dispensaries, medical clinics, and hospitals in Sri Lanka.

## Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Laravel 11, PHP 8.3, MySQL, Redis, Laravel Reverb (WebSockets)
- **Real-time Queue & TV Chimes**: WebSockets via Laravel Reverb + Echo
- **Data Compliance**: PDPA (Sri Lanka Personal Data Protection Act) & HIPAA compliant health data architecture with AES-256 field encryption

## Workspace Structure

- `frontend/` - Next.js Application (Doctor Desk, Reception, Pharmacy, Cashier, Waiting TV, Landlord Admin)
- `backend/` - Laravel REST API, Queue Management, FIFO Pharmacy Stock Inventory, Multi-tenant DB
- `doc/` - Architecture blueprints, project implementation plans, and compliance documentation

## License

Proprietary - All rights reserved.
