<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class Audit
{
    private const SECRET_KEYS = [
        'password', 'password_confirmation', 'current_password', 'new_password',
        'token', 'plain_text_token', 'access_token', 'refresh_token', 'remember_token',
        'code', 'otp', 'verification_code', 'email_verification_code', 'secret', 'api_key',
        'document_data', 'logo_data', 'image_data',
        'attachment_data', 'company_logo_data',
    ];

    public static function record(Request $request, string $action, Model $target, ?array $before = null, ?array $after = null, ?User $actor = null): void
    {
        AuditLog::create([
            'actor_id' => ($actor ?? $request->user())?->id,
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

    public static function recordRequest(Request $request, int $status, bool $succeeded, ?\Throwable $exception = null): void
    {
        $actor = $request->user();
        $target = collect($request->route()?->parameters() ?? [])->first(fn ($parameter) => $parameter instanceof Model);

        AuditLog::create([
            'actor_id' => $actor?->id,
            'action' => 'api.request',
            'target_type' => $target?->getMorphClass() ?? 'api_request',
            'target_id' => $target?->getKey() ?? $actor?->id ?? 0,
            'before' => null,
            'after' => self::redact([
                'method' => $request->method(),
                'path' => '/'.$request->path(),
                'route' => $request->route()?->uri(),
                'status' => $status,
                'succeeded' => $succeeded,
                'input' => $request->input(),
                'exception' => $exception ? class_basename($exception) : null,
            ]),
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 1000),
            'created_at' => now(),
        ]);
    }

    private static function redact(?array $values): ?array
    {
        if ($values === null) return null;
        foreach ($values as $key => $value) {
            if (in_array(strtolower((string) $key), self::SECRET_KEYS, true)) {
                unset($values[$key]);
                continue;
            }
            if (is_array($value)) $values[$key] = self::redact($value);
            if (is_string($value) && preg_match('#^data:[^;,]+(?:;[^,]*)?;base64,#i', $value)) {
                $values[$key] = '[redacted binary data]';
            } elseif (is_string($value) && mb_strlen($value) > 5000) {
                $values[$key] = mb_substr($value, 0, 5000).'… [truncated]';
            }
        }
        return $values;
    }
}
