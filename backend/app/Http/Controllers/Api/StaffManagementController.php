<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Doctor;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class StaffManagementController extends Controller
{
    /**
     * List all staff members with assigned roles.
     */
    public function index(Request $request): JsonResponse
    {
        $users = User::with('roles')->get()->map(function (User $user) {
            $doctorProfile = Doctor::where('user_id', $user->id)->first();
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at?->toDateString(),
                'roles' => $user->roles->pluck('name'),
                'doctor_profile' => $doctorProfile ? [
                    'id' => $doctorProfile->id,
                    'slmc_reg_no' => $doctorProfile->slmc_reg_no,
                    'specialization' => $doctorProfile->specialization,
                    'room_number' => $doctorProfile->room_number,
                    'consultation_fee' => $doctorProfile->consultation_fee,
                ] : null,
            ];
        });

        // Available standard clinic roles
        $availableRoles = ['Admin', 'Doctor', 'Receptionist', 'Pharmacist', 'Cashier'];

        return response()->json([
            'success' => true,
            'data' => [
                'staff' => $users,
                'available_roles' => $availableRoles,
            ],
        ]);
    }

    /**
     * Register a new clinic staff member with assigned role.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)],
            'role' => 'required|in:Admin,Doctor,Receptionist,Pharmacist,Cashier',
            // Optional doctor profile fields
            'slmc_reg_no' => 'nullable|string|max:50',
            'specialization' => 'nullable|string|max:100',
            'room_number' => 'nullable|string|max:20',
            'consultation_fee' => 'nullable|numeric|min:0',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Ensure role exists in tenant DB and assign
        $roleName = $validated['role'];
        Role::findOrCreate($roleName, 'web');
        $user->assignRole($roleName);

        // If role is Doctor, create corresponding Doctor profile
        if ($roleName === 'Doctor') {
            Doctor::create([
                'user_id' => $user->id,
                'slmc_reg_no' => $validated['slmc_reg_no'] ?? null,
                'specialization' => $validated['specialization'] ?? 'General Practice (GP)',
                'room_number' => $validated['room_number'] ?? 'Room 01',
                'consultation_fee' => $validated['consultation_fee'] ?? 1500.00,
                'is_active' => true,
            ]);
        }

        AuditLogService::log(
            action: 'CREATED_STAFF_MEMBER',
            resourceType: 'User',
            resourceId: $user->id,
            details: ['name' => $user->name, 'email' => $user->email, 'role' => $roleName]
        );

        return response()->json([
            'success' => true,
            'message' => "Staff member {$user->name} created and assigned '{$roleName}' role.",
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => [$roleName],
            ],
        ], 201);
    }

    /**
     * Update/Change a staff member's role.
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'role' => 'required|in:Admin,Doctor,Receptionist,Pharmacist,Cashier',
        ]);

        $user = User::findOrFail($id);
        $newRole = $validated['role'];

        Role::findOrCreate($newRole, 'web');
        $user->syncRoles([$newRole]);

        // If changing to Doctor, ensure a doctor profile exists
        if ($newRole === 'Doctor' && !Doctor::where('user_id', $user->id)->exists()) {
            Doctor::create([
                'user_id' => $user->id,
                'specialization' => 'General Practice (GP)',
                'room_number' => 'Room 01',
                'consultation_fee' => 1500.00,
                'is_active' => true,
            ]);
        }

        AuditLogService::log(
            action: 'UPDATED_STAFF_ROLE',
            resourceType: 'User',
            resourceId: $user->id,
            details: ['name' => $user->name, 'new_role' => $newRole]
        );

        return response()->json([
            'success' => true,
            'message' => "Role for {$user->name} updated to '{$newRole}'.",
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'roles' => [$newRole],
            ],
        ]);
    }

    /**
     * Remove / terminate staff member credentials.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Prevent self-deletion
        if (auth()->id() === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        // Revoke all tokens
        $user->tokens()->delete();
        $user->delete();

        AuditLogService::log(
            action: 'REMOVED_STAFF_MEMBER',
            resourceType: 'User',
            resourceId: $id,
            details: ['name' => $user->name, 'email' => $user->email]
        );

        return response()->json([
            'success' => true,
            'message' => "Staff member {$user->name} removed and all active sessions terminated.",
        ]);
    }
}
