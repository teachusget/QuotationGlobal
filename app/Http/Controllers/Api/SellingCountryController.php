<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\Request;

class SellingCountryController extends Controller
{
    public function show()
    {
        return response()->json(['data' => ['allowed_countries' => PlatformSetting::allowedSellingCountries()]]);
    }

    public function update(Request $request)
    {
        abort_unless($request->user()->account_type === 'staff', 403, 'Only administrators can update selling countries.');
        $data = $request->validate([
            'allowed_countries' => ['required', 'array', 'min:1'],
            'allowed_countries.*' => ['required', 'string', 'size:2', 'regex:/^[A-Z]{2}$/'],
        ]);
        $countries = array_values(array_unique($data['allowed_countries']));
        PlatformSetting::updateOrCreate(['key' => 'allowed_selling_countries'], ['value' => $countries]);

        return response()->json(['message' => 'Allowed selling countries updated.', 'data' => ['allowed_countries' => $countries]]);
    }
}
