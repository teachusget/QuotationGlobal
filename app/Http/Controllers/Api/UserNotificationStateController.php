<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotificationState;
use Illuminate\Http\Request;

class UserNotificationStateController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => UserNotificationState::where('user_id', $request->user()->id)
            ->get(['notification_key', 'read_at', 'cleared_at'])]);
    }

    public function markRead(Request $request)
    {
        return $this->record($request, 'read_at', 'Notifications marked as read.');
    }

    public function clear(Request $request)
    {
        return $this->record($request, 'cleared_at', 'Notifications cleared.');
    }

    private function record(Request $request, string $column, string $message)
    {
        $data = $request->validate([
            'keys' => ['required', 'array', 'max:100'],
            'keys.*' => ['required', 'string', 'max:150', 'regex:/^[a-z0-9:_-]+$/i'],
        ]);
        $now = now();
        $rows = collect($data['keys'])->unique()->map(fn ($key) => [
            'user_id' => $request->user()->id,
            'notification_key' => $key,
            $column => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();
        UserNotificationState::upsert($rows, ['user_id', 'notification_key'], [$column, 'updated_at']);

        return response()->json(['message' => $message]);
    }
}
