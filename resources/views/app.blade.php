<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <title>{{ config('app.name', 'QuotationGlobal') }}</title>
    <style>
        #app-bootstrap{position:fixed;inset:0;display:grid;place-items:center;background:#f7f9fc;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#475569}
        #app-bootstrap-logo{position:relative;display:grid;width:56px;height:56px;place-items:center;border-radius:16px;background:#0768f0;color:#fff;font-size:18px;font-weight:700;box-shadow:0 10px 25px rgba(15,23,42,.12)}
        #app-bootstrap-logo:after{content:"";position:absolute;inset:-5px;border:2px solid transparent;border-top-color:#0768f0;border-radius:20px;animation:app-spin .8s linear infinite}
        #app-bootstrap p{margin:16px 0 0;font-size:14px;font-weight:500}@keyframes app-spin{to{transform:rotate(360deg)}}
    </style>
    @viteReactRefresh
    @vite(['src/main.jsx'])
</head>
<body>
    <div id="root"><div id="app-bootstrap" role="status" aria-label="Loading workspace"><div><span id="app-bootstrap-logo">Q</span><p>Preparing your workspace</p></div></div></div>
</body>
</html>
