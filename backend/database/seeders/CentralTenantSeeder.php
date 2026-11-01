<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tenant;

class CentralTenantSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Provision Primary Clinic: Nawaloka Outpatient Care
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

        // 2. Provision Asiri Health
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

        // 3. Provision Demo Tenant: Arogya Medical Centre
        $arogya = Tenant::firstOrCreate(
            ['id' => 'arogya'],
            [
                'clinic_name' => 'Arogya Medical Centre',
                'contact_email' => 'admin@arogya.com',
                'contact_phone' => '+94 11 258 9632',
                'subscription_plan' => 'TRIAL',
                'status' => 'ACTIVE',
            ]
        );

        if (!$arogya->domains()->where('domain', 'arogya.localhost')->exists()) {
            $arogya->domains()->create(['domain' => 'arogya.localhost']);
        }

        // 4. Provision Second Demo Tenant: Suwa Piyasa Family Clinic
        $suwaPiyasa = Tenant::firstOrCreate(
            ['id' => 'suwapiyasa'],
            [
                'clinic_name' => 'Suwa Piyasa Family Clinic',
                'contact_email' => 'admin@suwapiyasa.com',
                'contact_phone' => '+94 81 223 4567',
                'subscription_plan' => 'TRIAL',
                'status' => 'ACTIVE',
            ]
        );

        if (!$suwaPiyasa->domains()->where('domain', 'suwapiyasa.localhost')->exists()) {
            $suwaPiyasa->domains()->create(['domain' => 'suwapiyasa.localhost']);
        }

        // Run isolated seeders safely with error suppression for pre-seeded databases
        foreach ([$nawaloka, $asiri, $arogya, $suwaPiyasa] as $tenant) {
            try {
                $tenant->run(function () {
                    $this->call(TenantDatabaseSeeder::class);
                });
            } catch (\Throwable $e) {
                // Silently skip if database tables or records already exist
            }
        }
    }
}
