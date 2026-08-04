<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExcludeBuyerAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->user()?->role === 'buyer', 403, 'Buyer accounts can only access the marketplace.');

        return $next($request);
    }
}
