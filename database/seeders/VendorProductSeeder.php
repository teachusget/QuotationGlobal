<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Industry;
use App\Models\MarketplacePage;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Support\MarketplaceDefaults;

class VendorProductSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(MarketplaceDemoSeeder::class);

        $vendors = [
            ['company' => 'Nexora Technologies', 'contact' => 'Ali Raza', 'email' => 'vendor1@nexora.pk', 'phone' => '+92 300 1110001', 'city' => 'Lahore', 'industry' => 'Information Technology', 'category' => 'Business Management', 'brand' => 'Microsoft', 'color' => '#2563eb', 'products' => [['Nexora ERP Cloud', 45000, 'software'], ['Smart Workflow Suite', 28000, 'software']]],
            ['company' => 'MediCore Systems', 'contact' => 'Dr. Sana Malik', 'email' => 'vendor2@medicore.pk', 'phone' => '+92 300 1110002', 'city' => 'Karachi', 'industry' => 'Healthcare', 'category' => 'Healthcare', 'brand' => 'Oracle', 'color' => '#0891b2', 'products' => [['MediCore Hospital ERP', 65000, 'software'], ['Clinic Pro Manager', 22000, 'software']]],
            ['company' => 'EduSpark Solutions', 'contact' => 'Hamza Ahmed', 'email' => 'vendor3@eduspark.pk', 'phone' => '+92 300 1110003', 'city' => 'Islamabad', 'industry' => 'Education', 'category' => 'Education', 'brand' => 'Google Cloud', 'color' => '#7c3aed', 'products' => [['Campus360 School ERP', 32000, 'software'], ['Smart Learning Portal', 18000, 'services']]],
            ['company' => 'RetailNova Pakistan', 'contact' => 'Ayesha Khan', 'email' => 'vendor4@retailnova.pk', 'phone' => '+92 300 1110004', 'city' => 'Faisalabad', 'industry' => 'Retail', 'category' => 'Retail & POS', 'brand' => 'QuickBooks', 'color' => '#16a34a', 'products' => [['NovaPOS Retail System', 25000, 'software'], ['Inventory Smart Track', 19500, 'hardware']]],
            ['company' => 'SecureStack Labs', 'contact' => 'Usman Tariq', 'email' => 'vendor5@securestack.pk', 'phone' => '+92 300 1110005', 'city' => 'Rawalpindi', 'industry' => 'Information Technology', 'category' => 'Cyber Security', 'brand' => 'Cisco', 'color' => '#dc2626', 'products' => [['Endpoint Shield Pro', 38000, 'software'], ['Managed SOC Service', 85000, 'services']]],
            ['company' => 'CloudVerse Technologies', 'contact' => 'Zainab Noor', 'email' => 'vendor6@cloudverse.pk', 'phone' => '+92 300 1110006', 'city' => 'Lahore', 'industry' => 'Professional Services', 'category' => 'Cloud & IT Infrastructure', 'brand' => 'Amazon Web Services', 'color' => '#ea580c', 'products' => [['Cloud Backup Enterprise', 30000, 'services'], ['Virtual Server Plus', 42000, 'hardware']]],
            ['company' => 'PeopleFirst HR', 'contact' => 'Bilal Hussain', 'email' => 'vendor7@peoplefirst.pk', 'phone' => '+92 300 1110007', 'city' => 'Karachi', 'industry' => 'Professional Services', 'category' => 'Human Resources', 'brand' => 'SAP', 'color' => '#0284c7', 'products' => [['PeopleFirst HRMS', 27000, 'software'], ['Payroll & Attendance Pro', 21000, 'software']]],
            ['company' => 'FinEdge Business Systems', 'contact' => 'Maham Shah', 'email' => 'vendor8@finedge.pk', 'phone' => '+92 300 1110008', 'city' => 'Multan', 'industry' => 'Financial Services', 'category' => 'Accounting & Finance', 'brand' => 'QuickBooks', 'color' => '#059669', 'products' => [['FinEdge Accounting', 24000, 'software'], ['Digital Billing Desk', 16000, 'software']]],
            ['company' => 'GrowthPilot Digital', 'contact' => 'Omer Farooq', 'email' => 'vendor9@growthpilot.pk', 'phone' => '+92 300 1110009', 'city' => 'Islamabad', 'industry' => 'Real Estate', 'category' => 'Marketing', 'brand' => 'HubSpot', 'color' => '#db2777', 'products' => [['Growth CRM Automation', 35000, 'software'], ['Digital Campaign Studio', 50000, 'services']]],
            ['company' => 'LogiConnect Solutions', 'contact' => 'Hira Iqbal', 'email' => 'vendor10@logiconnect.pk', 'phone' => '+92 300 1110010', 'city' => 'Sialkot', 'industry' => 'Logistics', 'category' => 'Sales & CRM', 'brand' => 'Salesforce', 'color' => '#4f46e5', 'products' => [['Fleet & Delivery Manager', 47000, 'software'], ['Customer Connect CRM', 29000, 'software']]],
        ];

        foreach ($vendors as $index => $data) {
            $industry = Industry::where('name', $data['industry'])->firstOrFail();
            $category = Category::whereNull('parent_id')->where('name', $data['category'])->firstOrFail();
            $subcategory = Category::where('parent_id', $category->id)->firstOrFail();
            $brand = Brand::where('name', $data['brand'])->firstOrFail();
            [$firstName, $lastName] = array_pad(explode(' ', $data['contact'], 2), 2, '');

            $user = User::updateOrCreate(['email' => $data['email']], [
                'name' => $data['contact'],
                'username' => 'vendor'.($index + 1),
                'password' => Hash::make('Vendor@123'),
                'account_type' => 'vendor',
                'email_verified_at' => now(),
            ]);
            $user->syncRoles(['Vendor']);

            $vendor = Vendor::updateOrCreate(['email' => $data['email']], [
                'user_id' => $user->id,
                'registration_type' => 'company',
                'name' => $data['contact'],
                'first_name' => $firstName,
                'last_name' => $lastName,
                'designation' => 'Business Development Manager',
                'phone' => $data['phone'],
                'country' => 'Pakistan',
                'address' => 'Main Business District, '.$data['city'].', Pakistan',
                'city' => $data['city'],
                'company_name' => $data['company'],
                'business_type' => 'Technology Solutions Provider',
                'industry_id' => $industry->id,
                'service_category_id' => $category->id,
                'status' => 'approved',
                'logo_data' => $this->svgData($this->initials($data['company']), $data['color'], $data['company']),
            ]);

            foreach ($data['products'] as $productIndex => [$productName, $price, $type]) {
                $service = Service::updateOrCreate([
                    'vendor_id' => $vendor->id,
                    'name' => $productName,
                    'billing_cycle' => 'monthly',
                ], [
                    'category_id' => $category->id,
                    'subcategory_id' => $subcategory->id,
                    'industry_id' => $industry->id,
                    'brand_id' => $brand->id,
                    'service_type' => $type,
                    'pricing_mode' => $productIndex === 0 ? 'starting_price' : 'flexible_price',
                    'price_from' => $price,
                    'monthly_price' => $price,
                    'discount_percent' => $productIndex === 0 ? 10 : 5,
                    'image_data' => $this->svgData($this->initials($productName), $data['color'], $productName),
                ]);

                $service->industries()->syncWithoutDetaching([$industry->id]);
                $service->brands()->syncWithoutDetaching([$brand->id]);
                ServiceImage::updateOrCreate(['service_id' => $service->id, 'sort_order' => 0], [
                    'image_data' => $this->svgData($this->initials($productName), $data['color'], $productName),
                ]);
            }
        }

        $emails = collect($vendors)->pluck('email');
        $seededVendors = Vendor::whereIn('email', $emails)->withCount('services')->get();
        if ($seededVendors->count() !== 10 || $seededVendors->sum('services_count') !== 20 || $seededVendors->contains(fn ($vendor) => $vendor->services_count !== 2)) {
            throw new \RuntimeException('Vendor product seed verification failed: expected 10 vendors with exactly 2 products each.');
        }
        $page = MarketplacePage::where('slug', 'home')->with('publishedVersion')->first();
        $hasCatalog = collect($page?->draft_document['sections'] ?? [])->contains(fn ($section) => ! empty($section['settings']['catalog_ids'] ?? []));
        if ($page && ! $hasCatalog && $page->publishedVersion?->version_number === 1) {
            $document = MarketplaceDefaults::document();
            $page->update(['draft_document' => $document]);
            $page->publishedVersion->update(['document' => $document]);
        }
        $this->command?->info('Verified: 10 vendors and 20 products (2 products per vendor).');
    }

    private function initials(string $name): string
    {
        return Str::of($name)->explode(' ')->take(2)->map(fn ($word) => Str::upper(Str::substr($word, 0, 1)))->join('');
    }

    private function svgData(string $initials, string $color, string $label): string
    {
        $label = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560"><rect width="900" height="560" rx="36" fill="#f8fafc"/><circle cx="450" cy="220" r="105" fill="'.$color.'"/><text x="450" y="245" text-anchor="middle" font-family="Arial,sans-serif" font-size="78" font-weight="700" fill="white">'.$initials.'</text><text x="450" y="385" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#0f172a">'.$label.'</text><text x="450" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#64748b">Verified Marketplace Solution</text></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
}
