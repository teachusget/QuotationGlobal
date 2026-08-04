<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class Audit
{
    private const SECRET_KEYS = ['password', 'password_confirmation', 'token', 'remember_token', 'email_verification_code'];

    public static function record(Request $request, string $action, Model $target, ?array $before = null, ?array $after = null): void
    {
        AuditLog::create([
            'actor_id' => $request->user()?->id,
            'action' => $action,
            'target_type' => $target->getMorphClass(),
            'target_id' => $target->getKey(),
            'before' => self::redact($before),
            'after' => self::redact($after),
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 1000),
            'created_at' => now(),
        ]);
    }

    private static function redact(?array $values): ?array
    {
        if ($values === null) return null;
        foreach (self::SECRET_KEYS as $key) unset($values[$key]);
        return $values;
    }
}
