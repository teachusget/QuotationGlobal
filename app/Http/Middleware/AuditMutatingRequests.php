<?php

namespace App\Http\Middleware;

use App\Support\Audit;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class AuditMutatingRequests
{
    public function handle(Request $request, Closure $next)
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            $status = match (true) {
                $exception instanceof HttpExceptionInterface => $exception->getStatusCode(),
                $exception instanceof ValidationException => $exception->status,
                $exception instanceof AuthenticationException => 401,
                default => 500,
            };
            $this->record($request, $status, false, $exception);
            throw $exception;
        }

        $this->record($request, $response->getStatusCode(), $response->isSuccessful());

        return $response;
    }

    private function record(Request $request, int $status, bool $succeeded, ?Throwable $exception = null): void
    {
        try {
            Audit::recordRequest($request, $status, $succeeded, $exception);
        } catch (Throwable $auditException) {
            Log::error('Request audit could not be persisted.', [
                'method' => $request->method(),
                'path' => $request->path(),
                'status' => $status,
                'error' => $auditException->getMessage(),
            ]);
        }
    }
}
