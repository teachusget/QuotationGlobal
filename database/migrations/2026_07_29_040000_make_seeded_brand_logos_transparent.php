<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $brands = [
            'Amazon Web Services' => ['AWS', '#FF9900'],
            'Cisco' => ['CISCO', '#00BCEB'],
            'Google Cloud' => ['Google Cloud', '#4285F4'],
            'HubSpot' => ['HubSpot', '#FF7A59'],
            'Microsoft' => ['Microsoft', '#2563EB'],
            'Oracle' => ['ORACLE', '#F80000'],
            'QuickBooks' => ['quickbooks', '#2CA01C'],
            'Salesforce' => ['salesforce', '#00A1E0'],
            'SAP' => ['SAP', '#0FAAFF'],
            'Zoho' => ['ZOHO', '#E42527'],
        ];

        foreach ($brands as $name => [$wordmark, $color]) {
            $safeName = htmlspecialchars($wordmark, ENT_QUOTES | ENT_XML1);
            $mark = htmlspecialchars(strtoupper(substr($wordmark, 0, 2)), ENT_QUOTES | ENT_XML1);
            $fontSize = strlen($wordmark) > 10 ? 20 : 24;
            $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64">'
                .'<circle cx="27" cy="32" r="22" fill="'.$color.'"/>'
                .'<text x="27" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="800" fill="#ffffff">'.$mark.'</text>'
                .'<text x="58" y="40" font-family="Arial,sans-serif" font-size="'.$fontSize.'" font-weight="800" fill="'.$color.'" stroke="#ffffff" stroke-width=".7" paint-order="stroke">'.$safeName.'</text>'
                .'</svg>';

            DB::table('brands')->where('name', $name)->update([
                'logo_data' => 'data:image/svg+xml;base64,'.base64_encode($svg),
            ]);
        }
    }

    public function down(): void
    {
        // Transparent logo improvements are intentionally retained on rollback.
    }
};
