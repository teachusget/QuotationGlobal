<!doctype html>
<html lang="en">
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
<div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
    <div style="display:inline-block;background:#dcfce7;color:#166534;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:bold;margin-bottom:16px">REQUEST ACCEPTED</div>
    <h1 style="font-size:22px;margin:0 0 12px">Your online demo is confirmed</h1>
    <p style="line-height:1.6">Hi {{ $demoRequest->user->name }},</p>
    <p style="line-height:1.6">Your meeting for <strong>{{ $demoRequest->service->name }}</strong> has been confirmed by {{ $demoRequest->vendor->company_name ?: $demoRequest->vendor->name }}.</p>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Meeting time:</strong> {{ $demoRequest->demo_at->timezone(config('app.timezone'))->format('d M Y, h:i A') }} (PKT)</p>
        <p style="margin:0;word-break:break-all"><strong>Meeting link:</strong> {{ $demoRequest->meeting_link }}</p>
    </div>
    <p style="margin:24px 0"><a href="{{ $demoRequest->meeting_link }}" style="display:inline-block;background:#0b6ff4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Join online meeting</a></p>
    <p style="font-size:13px;color:#64748b;line-height:1.6">Chat with the vendor is now active in your My Demo Requests page.</p>
</div>
</body>
</html>
