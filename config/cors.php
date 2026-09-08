<?php

$origins = array_values(array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', env('APP_URL', 'http://localhost:8000'))))));

return ['paths' => ['api/*', 'sanctum/csrf-cookie'], 'allowed_methods' => ['*'], 'allowed_origins' => $origins, 'allowed_origins_patterns' => [], 'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With', 'X-XSRF-TOKEN'], 'exposed_headers' => [], 'max_age' => 600, 'supports_credentials' => false];
