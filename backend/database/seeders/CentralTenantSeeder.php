<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tenant;

class CentralTenantSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Provision Demo Tenant: Arogya Medical Centre
        $arogya = Tenant::firstOrCreate(
            ['id' => 'arogya'],
            [
                'clinic_name' => 'Arogya Medical Centre',
                'contact_email' => 'admin@arogya.com',
                'contact_phone' => '+94 11 258 9632',
            ]
        );

        if (!$arogya->domains()->where('domain', 'arogya.localhost')->exists()) {
            $arogya->domains()->create(['domain' => 'arogya.localhost']);
        }

        // Run Tenant Seeder inside the isolated Arogya database
        $arogya->run(function () {
            $this->call(TenantDatabaseSeeder::class);
        });

        // 2. Provision Second Demo Tenant: Suwa Piyasa Family Clinic (Testing Multi-Tenancy Isolation)
        $suwaPiyasa = Tenant::firstOrCreate(
            ['id' => 'suwapiyasa'],
            [
                'clinic_name' => 'Suwa Piyasa Family Clinic',
                'contact_email' => 'admin@suwapiyasa.com',
                'contact_phone' => '+94 81 223 4567',
            ]
        );

        if (!$suwaPiyasa->domains()->where('domain', 'suwapiyasa.localhost')->exists()) {
            $suwaPiyasa->domains()->create(['domain' => 'suwapiyasa.localhost']);
        }

        $suwaPiyasa->run(function () {
            $this->call(TenantDatabaseSeeder::class);
            // Customize Suwa Piyasa to have Pay-Before and Pharmacy Disabled
            \Illuminate\Support\Facades\DB::table('clinic_settings')->updateOrInsert(
                ['key' => 'consultation_payment_timing'],
                ['value' => json_encode('BEFORE')]
            );
            \Illuminate\Support\Facades\DB::table('clinic_settings')->updateOrInsert(
                ['key' => 'pharmacy_enabled'],
                ['value' => json_encode(false)]
            );
            \Illuminate\Support\Facades\DB::table('clinic_settings')->updateOrInsert(
                ['key' => 'clinic_branding'],
                ['value' => json_encode([
                    'clinic_name' => 'Suwa Piyasa Family Clinic',
                    'tagline' => 'Quality Primary Healthcare for the Whole Family',
                    'registration_no' => 'PHSRC/KAN/2026/142',
                    'address' => 'No. 88, Peradeniya Road, Kandy',
                    'phone' => '+94 81 223 4567',
                ])]
            );
        });

        // 3. Provision Nawaloka Outpatient Care (Primary Active Clinic)
        $nawaloka = Tenant::firstOrCreate(
            ['id' => 'nawaloka'],
            [
                'clinic_name' => 'Nawaloka Outpatient Care',
                'contact_email' => 'admin@nawaloka.lk',
                'contact_phone' => '+94 11 544 4444',
                'subscription_plan' => 'ENTERPRISE',
                'status' => 'ACTIVE',
            ]
        );

        if (!$nawaloka->domains()->where('domain', 'nawaloka.localhost')->exists()) {
            $nawaloka->domains()->create(['domain' => 'nawaloka.localhost']);
        }

        // 4. Provision Asiri Health
        $asiri = Tenant::firstOrCreate(
            ['id' => 'asiri'],
            [
                'clinic_name' => 'Asiri Health',
                'contact_email' => 'admin@asiri.lk',
                'contact_phone' => '+94 11 452 3300',
                'subscription_plan' => 'PROFESSIONAL',
                'status' => 'ACTIVE',
            ]
        );

        if (!$asiri->domains()->where('domain', 'asiri.localhost')->exists()) {
            $asiri->domains()->create(['domain' => 'asiri.localhost']);
        }
    }
}
