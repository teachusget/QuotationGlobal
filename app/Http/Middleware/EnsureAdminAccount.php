<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->user()?->role === 'vendor', 403, 'This action is only available to administrators.');

        return $next($request);
    }
}
