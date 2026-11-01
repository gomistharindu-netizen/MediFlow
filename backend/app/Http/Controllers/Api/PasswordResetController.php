<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordResetController extends Controller
{
    /**
     * Change password for the currently authenticated user.
     * Used from within the app (staff self-service).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * Admin resets another user's password (Admin-only endpoint).
     */
    public function adminResetPassword(Request $request, int $userId): JsonResponse
    {
        $request->validate([
            'new_password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $targetUser = User::findOrFail($userId);
        $targetUser->update(['password' => Hash::make($request->new_password)]);

        // Revoke all existing tokens so forced re-login
        $targetUser->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => "Password reset for {$targetUser->name}. All sessions terminated.",
        ]);
    }
}
