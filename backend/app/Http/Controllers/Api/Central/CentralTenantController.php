<?php

namespace App\Http\Controllers\Api\Central;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\TenantDatabaseSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CentralTenantController extends Controller
{
    /**
     * List all clinic tenants with domains, plans, and patient stats.
     */
    public function index(): JsonResponse
    {
        $tenants = Tenant::with('domains')->get();

        $data = $tenants->map(function ($t) {
            $patientCount = 0;
            $dbStatus = 'CONNECTED';

            try {
                $t->run(function () use (&$patientCount) {
                    $patientCount = DB::table('patients')->count();
                });
            } catch (\Exception $e) {
                $dbStatus = 'PROVISIONING_OR_OFFLINE';
            }

            // Subscription Model (TRIAL, MONTHLY, LIFETIME)
            $subType = $t->subscription_type ?? ($t->subscription_plan === 'TRIAL' ? 'TRIAL' : 'MONTHLY');
            $trialEndsAt = $t->trial_ends_at;
            $trialDaysRemaining = null;
            $isTrialExpired = false;

            if ($subType === 'TRIAL') {
                if (!$trialEndsAt && $t->created_at) {
                    $trialEndsAt = $t->created_at->addDays(14)->toIso8601String();
                }

                if ($trialEndsAt) {
                    $diff = now()->diffInDays(Carbon::parse($trialEndsAt), false);
                    $trialDaysRemaining = (int) ceil($diff);
                    if ($trialDaysRemaining <= 0) {
                        $trialDaysRemaining = 0;
                        $isTrialExpired = true;
                    }
                }
            }

            $lifetimeKey = null;
            if ($subType === 'LIFETIME') {
                $lifetimeKey = $t->lifetime_license_key ?? ('MF-LIFE-' . strtoupper(substr(md5($t->id . 'mediflow'), 0, 8)));
            }

            return [
                'id' => $t->id,
                'clinic_name' => $t->clinic_name ?? Str::headline($t->id),
                'contact_email' => $t->contact_email,
                'contact_phone' => $t->contact_phone,
                'subscription_plan' => $t->subscription_plan ?? 'PROFESSIONAL',
                'subscription_type' => $subType, // 'TRIAL' | 'MONTHLY' | 'LIFETIME'
                'trial_ends_at' => $trialEndsAt,
                'trial_days_remaining' => $trialDaysRemaining,
                'is_trial_expired' => $isTrialExpired,
                'lifetime_license_key' => $lifetimeKey,
                'next_billing_date' => $t->next_billing_date ?? ($subType === 'MONTHLY' ? now()->addDays(28)->format('Y-m-d') : null),
                'status' => $t->status ?? ($isTrialExpired ? 'EXPIRED' : 'ACTIVE'),
                'domains' => $t->domains->pluck('domain'),
                'primary_domain' => $t->domains->first()?->domain ?? "{$t->id}.localhost",
                'patient_count' => $patientCount,
                'db_status' => $dbStatus,
                'created_at' => $t->created_at?->format('Y-m-d H:i') ?? now()->format('Y-m-d H:i'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Provision and onboard a brand new clinic client.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'clinic_name' => 'required|string|max:150',
            'tenant_id' => 'required|string|alpha_dash|max:50|unique:tenants,id',
            'subdomain' => 'nullable|string|alpha_dash|max:50',
            'custom_domain' => 'nullable|string|max:150',
            'contact_email' => 'required|email|max:100',
            'contact_phone' => 'nullable|string|max:30',
            'subscription_type' => 'required|in:TRIAL,MONTHLY,LIFETIME',
            'subscription_plan' => 'required|in:STARTER,PROFESSIONAL,ENTERPRISE,TRIAL',
            'trial_days' => 'nullable|integer|min:1|max:90',
            'admin_name' => 'nullable|string|max:100',
            'admin_password' => 'nullable|string|min:6',
            'consultation_payment_timing' => 'nullable|in:BEFORE,AFTER',
            'pharmacy_enabled' => 'nullable|boolean',
            'thermal_printer_width' => 'nullable|in:80mm,58mm',
        ]);

        $tenantId = strtolower($validated['tenant_id']);
        $subdomain = strtolower($validated['subdomain'] ?? $tenantId);
        $domain = !empty($validated['custom_domain']) ? $validated['custom_domain'] : "{$subdomain}.localhost";

        // Setup Subscription & Trial Parameters
        $subType = $validated['subscription_type'];
        $trialDays = (int) ($validated['trial_days'] ?? 14);
        $trialEndsAt = null;
        $lifetimeKey = null;
        $nextBillingDate = null;

        if ($subType === 'TRIAL') {
            $trialEndsAt = now()->addDays($trialDays)->toIso8601String();
        } elseif ($subType === 'LIFETIME') {
            $lifetimeKey = 'MF-LIFE-' . strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4));
        } elseif ($subType === 'MONTHLY') {
            $nextBillingDate = now()->addMonth()->format('Y-m-d');
        }

        // 1. Create Central Tenant Record
        $tenant = Tenant::create([
            'id' => $tenantId,
            'clinic_name' => $validated['clinic_name'],
            'contact_email' => $validated['contact_email'],
            'contact_phone' => $validated['contact_phone'] ?? null,
            'subscription_plan' => $validated['subscription_plan'],
            'status' => 'ACTIVE',
        ]);

        // Save dynamic subscription attributes in Stancl tenant data
        $tenant->subscription_type = $subType;
        if ($trialEndsAt) $tenant->trial_ends_at = $trialEndsAt;
        if ($lifetimeKey) $tenant->lifetime_license_key = $lifetimeKey;
        if ($nextBillingDate) $tenant->next_billing_date = $nextBillingDate;
        $tenant->save();

        // 2. Assign Subdomain / Domain
        $tenant->domains()->create([
            'domain' => $domain,
        ]);

        // 3. Provision Database & Run Migrations
        Artisan::call('tenants:migrate', [
            '--tenants' => [$tenant->id],
        ]);

        // 4. Seed Essential Clinic Data inside isolated Tenant Database
        $adminEmail = $validated['contact_email'];
        $adminPass = $validated['admin_password'] ?? 'password123';
        $adminName = $validated['admin_name'] ?? 'Clinic Administrator';

        $timing = $validated['consultation_payment_timing'] ?? 'AFTER';
        $pharmacyOn = $validated['pharmacy_enabled'] ?? true;
        $printerWidth = $validated['thermal_printer_width'] ?? '80mm';

        $tenant->run(function () use ($tenant, $adminEmail, $adminPass, $adminName, $timing, $pharmacyOn, $printerWidth) {
            // Run standard seeders
            $seeder = new TenantDatabaseSeeder();
            $seeder->run();

            // Create customized admin user
            User::updateOrCreate(
                ['email' => $adminEmail],
                [
                    'name' => $adminName,
                    'password' => Hash::make($adminPass),
                    'email_verified_at' => now(),
                ]
            );

            // Configure tenant-specific settings
            DB::table('clinic_settings')->updateOrInsert(
                ['key' => 'consultation_payment_timing'],
                ['value' => json_encode($timing)]
            );
            DB::table('clinic_settings')->updateOrInsert(
                ['key' => 'pharmacy_enabled'],
                ['value' => json_encode($pharmacyOn)]
            );
            DB::table('clinic_settings')->updateOrInsert(
                ['key' => 'thermal_printer_width'],
                ['value' => json_encode($printerWidth)]
            );
            DB::table('clinic_settings')->updateOrInsert(
                ['key' => 'clinic_branding'],
                ['value' => json_encode([
                    'clinic_name' => $tenant->clinic_name,
                    'tagline' => 'Outpatient Clinic & Patient Management',
                    'phone' => $tenant->contact_phone ?? '+94 11 234 5678',
                    'address' => 'Colombo, Sri Lanka',
                ])]
            );
        });

        return response()->json([
            'success' => true,
            'message' => "Client clinic '{$tenant->clinic_name}' provisioned successfully on domain '{$domain}' ({$subType})!",
            'data' => [
                'tenant_id' => $tenant->id,
                'clinic_name' => $tenant->clinic_name,
                'domain' => $domain,
                'subscription_type' => $subType,
                'subscription_plan' => $tenant->subscription_plan,
                'trial_ends_at' => $trialEndsAt,
                'lifetime_license_key' => $lifetimeKey,
                'admin_email' => $adminEmail,
                'portal_url' => "http://localhost:3005/?clinic={$tenant->id}",
            ],
        ], 201);
    }

    /**
     * Update tenant subscription plan, type, trial extension, or status.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'subscription_type' => 'nullable|in:TRIAL,MONTHLY,LIFETIME',
            'subscription_plan' => 'nullable|in:STARTER,PROFESSIONAL,ENTERPRISE,TRIAL',
            'status' => 'nullable|in:ACTIVE,SUSPENDED,EXPIRED',
            'extend_trial_days' => 'nullable|integer|min:1|max:90',
            'clinic_name' => 'nullable|string|max:150',
            'contact_phone' => 'nullable|string|max:30',
        ]);

        if (isset($validated['subscription_plan'])) {
            $tenant->subscription_plan = $validated['subscription_plan'];
        }
        if (isset($validated['status'])) {
            $tenant->status = $validated['status'];
        }
        if (isset($validated['clinic_name'])) {
            $tenant->clinic_name = $validated['clinic_name'];
        }
        if (isset($validated['contact_phone'])) {
            $tenant->contact_phone = $validated['contact_phone'];
        }

        // Handle Subscription Type changes & Trial Extensions
        if (isset($validated['subscription_type'])) {
            $tenant->subscription_type = $validated['subscription_type'];

            if ($validated['subscription_type'] === 'LIFETIME' && empty($tenant->lifetime_license_key)) {
                $tenant->lifetime_license_key = 'MF-LIFE-' . strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4));
            } elseif ($validated['subscription_type'] === 'MONTHLY') {
                $tenant->next_billing_date = now()->addMonth()->format('Y-m-d');
            } elseif ($validated['subscription_type'] === 'TRIAL' && empty($tenant->trial_ends_at)) {
                $tenant->trial_ends_at = now()->addDays(14)->toIso8601String();
            }
        }

        // Extend trial days
        if (!empty($validated['extend_trial_days'])) {
            $currentEnd = $tenant->trial_ends_at ? Carbon::parse($tenant->trial_ends_at) : now();
            $base = $currentEnd->isPast() ? now() : $currentEnd;
            $newEnd = $base->addDays((int) $validated['extend_trial_days']);
            $tenant->trial_ends_at = $newEnd->toIso8601String();
            $tenant->subscription_type = 'TRIAL';
            $tenant->status = 'ACTIVE';
        }

        $tenant->save();

        return response()->json([
            'success' => true,
            'message' => "Tenant '{$tenant->id}' updated successfully.",
            'data' => $tenant,
        ]);
    }

    /**
     * Get SaaS Subscription Plans (Trial, Monthly, Lifetime).
     */
    public function plans(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'id' => 'TRIAL_14_DAYS',
                    'name' => '14-Day Free Trial',
                    'price_lkr' => 0,
                    'price_usd' => 0,
                    'billing_cycle' => '14 days free',
                    'badge' => 'Free Trial',
                    'features' => [
                        'Full 14 Days Free Access',
                        'No Credit Card Required',
                        'Up to 3 Doctors & 100 Patients / Day',
                        'In-House Pharmacy & FIFO Dispense',
                        'Stylus Pen Drawing & Anatomy Templates',
                        'Full-Screen TV Waiting Room Queue Display',
                        'Patient SMS & Real-Time Queue Tracker',
                    ],
                ],
                [
                    'id' => 'STARTER',
                    'name' => 'Clinic Starter Plan',
                    'price_lkr' => 4500,
                    'price_usd' => 15,
                    'billing_cycle' => 'monthly',
                    'badge' => 'Solo Doctors',
                    'features' => [
                        'Up to 30 Patients / Day',
                        'Single Doctor Consultation Desk',
                        'External Pharmacy Mode',
                        '50 SMS Notifications / Month',
                        'Standard Subdomain (clinic.mediflow.lk)',
                        '80mm/58mm Thermal Printing',
                    ],
                ],
                [
                    'id' => 'PROFESSIONAL',
                    'name' => 'Clinic Professional Plan',
                    'price_lkr' => 9500,
                    'price_usd' => 30,
                    'billing_cycle' => 'monthly',
                    'is_popular' => true,
                    'badge' => 'Most Popular',
                    'features' => [
                        'Up to 150 Patients / Day',
                        'Up to 3 Simultaneous Doctor Desks',
                        'In-House Pharmacy FIFO Earliest-Expiry Inventory',
                        'Dual-Mode Billing (Pay-Before & Pay-After)',
                        '✍️ Stylus Pen & Anatomy Drawing Pad',
                        '🎤 Live Voice Dictation for Prescriptions',
                        '300 SMS Notifications / Month',
                        'Full-Screen TV Display with Audio Chime',
                    ],
                ],
                [
                    'id' => 'ENTERPRISE',
                    'name' => 'Healthcare Enterprise Plan',
                    'price_lkr' => 19500,
                    'price_usd' => 65,
                    'billing_cycle' => 'monthly',
                    'badge' => 'Hospital / Center',
                    'features' => [
                        'Unlimited Patients & Doctors',
                        'Custom Branded Domain (e.g. clinic.asiri.lk)',
                        'Multi-Counter Cashier & Pharmacy Desks',
                        '1,000 SMS Notifications / Month',
                        'Automated Daily Offsite Database Backup',
                        'Priority 24/7 SLMC Compliance Support',
                    ],
                ],
                [
                    'id' => 'LIFETIME',
                    'name' => 'Perpetual Lifetime License',
                    'price_lkr' => 185000,
                    'price_usd' => 600,
                    'billing_cycle' => 'one-time lifetime',
                    'badge' => '♾️ Lifetime',
                    'features' => [
                        'One-time Payment — Zero Monthly Subscription Fees',
                        'Unlimited Patients, Doctors, & Staff Forever',
                        'Deploy On-Premise Local Server or Cloud VPS',
                        'Perpetual License Certificate & Code',
                        'Full In-House Pharmacy, Cashier, Reception, TV Hub',
                        '1 Year Free Feature Updates & Technical Support',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Aggregate SaaS platform analytics with Trial, Monthly, and Lifetime breakdown.
     */
    public function stats(): JsonResponse
    {
        $tenants = Tenant::all();
        $totalTenants = $tenants->count();
        $activeTenants = $tenants->where('status', 'ACTIVE')->count();

        $trialCount = 0;
        $monthlyCount = 0;
        $lifetimeCount = 0;
        $expiringTrialsCount = 0;
        $mrrLkr = 0;

        foreach ($tenants as $t) {
            $subType = $t->subscription_type ?? ($t->subscription_plan === 'TRIAL' ? 'TRIAL' : 'MONTHLY');

            if ($subType === 'TRIAL') {
                $trialCount++;
                $trialEnds = $t->trial_ends_at ? Carbon::parse($t->trial_ends_at) : ($t->created_at ? $t->created_at->addDays(14) : null);
                if ($trialEnds) {
                    $days = now()->diffInDays($trialEnds, false);
                    if ($days >= 0 && $days <= 3) {
                        $expiringTrialsCount++;
                    }
                }
            } elseif ($subType === 'LIFETIME') {
                $lifetimeCount++;
            } else {
                $monthlyCount++;
                $plan = $t->subscription_plan ?? 'PROFESSIONAL';
                if ($plan === 'STARTER') $mrrLkr += 4500;
                elseif ($plan === 'PROFESSIONAL') $mrrLkr += 9500;
                elseif ($plan === 'ENTERPRISE') $mrrLkr += 19500;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_tenants' => $totalTenants,
                'active_tenants' => $activeTenants,
                'trial_tenants' => $trialCount,
                'monthly_tenants' => $monthlyCount,
                'lifetime_tenants' => $lifetimeCount,
                'expiring_trials_count' => $expiringTrialsCount,
                'mrr_lkr' => $mrrLkr,
                'mrr_usd' => round($mrrLkr / 300, 2),
                'platform_version' => 'MediFlow SaaS v2.0 (Multi-Tenant + 14-Day Trials + Lifetime)',
            ],
        ]);
    }
}
