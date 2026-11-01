<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials provided for this clinic.'],
            ]);
        }

        // Revoke old tokens if any
        $user->tokens()->delete();

        $token = $user->createToken('mediflow_staff_token')->plainTextToken;
        $roles = $user->getRoleNames();

        // Check if user is also a doctor
        $doctorProfile = null;
        if ($user->hasRole('Doctor')) {
            $doctorProfile = Doctor::where('user_id', $user->id)->first();
        }

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $roles,
                'doctor_profile' => $doctorProfile,
            ],
            'tenant' => tenant('id'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $roles = $user->getRoleNames();
        $permissions = $user->getAllPermissions()->pluck('name');

        $doctorProfile = null;
        if ($user->hasRole('Doctor')) {
            $doctorProfile = Doctor::where('user_id', $user->id)->first();
        }

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $roles,
                'permissions' => $permissions,
                'doctor_profile' => $doctorProfile,
            ],
            'tenant' => tenant('id'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }
}
