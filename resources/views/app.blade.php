<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <title>{{ config('app.name', 'QuotationGlobal') }}</title>
    @viteReactRefresh
    @vite(['src/main.jsx'])
</head>
<body>
    <div id="root"></div>
</body>
</html>
