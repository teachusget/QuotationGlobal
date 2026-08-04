<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $brands = [
            'Amazon Web Services' => ['AWS', '#FF9900', 'Cloud computing, storage, databases, analytics, security and scalable infrastructure services.'],
            'Cisco' => ['CISCO', '#049FD9', 'Networking, cybersecurity, collaboration and enterprise infrastructure solutions.'],
            'Google Cloud' => ['G CLOUD', '#4285F4', 'Cloud infrastructure, data analytics, artificial intelligence and application modernization tools.'],
            'HubSpot' => ['HubSpot', '#FF7A59', 'CRM, marketing automation, sales, customer service and content management software.'],
            'Microsoft' => ['Microsoft', '#2563EB', 'Business productivity, cloud, security, collaboration and enterprise software solutions.'],
            'Oracle' => ['ORACLE', '#F80000', 'Enterprise databases, cloud applications, infrastructure and business management platforms.'],
            'QuickBooks' => ['quickbooks', '#2CA01C', 'Accounting, invoicing, payroll, expense tracking and financial management software.'],
            'Salesforce' => ['salesforce', '#00A1E0', 'Customer relationship management, sales, service, marketing and commerce solutions.'],
            'SAP' => ['SAP', '#0FAAFF', 'Enterprise resource planning, finance, supply chain, HR and business transformation software.'],
            'Zoho' => ['ZOHO', '#E42527', 'Business applications for CRM, finance, workplace collaboration, support and operations.'],
        ];

        foreach ($brands as $name => [$wordmark, $color, $description]) {
            $brand = DB::table('brands')->where('name', $name)->first();
            if (! $brand) {
                continue;
            }

            $updates = ['details' => $description];
            if (empty($brand->logo_data)) {
                $safeWordmark = htmlspecialchars($wordmark, ENT_QUOTES | ENT_XML1);
                $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">'
                    .'<rect width="240" height="120" rx="18" fill="#ffffff"/>'
                    .'<rect x="8" y="8" width="224" height="104" rx="14" fill="'.$color.'" opacity=".10"/>'
                    .'<circle cx="46" cy="60" r="25" fill="'.$color.'"/>'
                    .'<text x="46" y="67" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#ffffff">'.htmlspecialchars(substr($wordmark, 0, 2), ENT_QUOTES | ENT_XML1).'</text>'
                    .'<text x="82" y="67" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="'.$color.'">'.$safeWordmark.'</text>'
                    .'</svg>';
                $updates['logo_data'] = 'data:image/svg+xml;base64,'.base64_encode($svg);
            }

            DB::table('brands')->where('id', $brand->id)->update($updates);
        }
    }

    public function down(): void
    {
        // Brand enrichment is intentionally retained if the schema is rolled back.
    }
};
