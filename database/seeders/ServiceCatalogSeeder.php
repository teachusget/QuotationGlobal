<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Industry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServiceCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = [
            'Business Software' => ['ERP Systems', 'CRM Solutions', 'HR Management', 'Accounting Software'],
            'Healthcare Technology' => ['Hospital Management', 'Clinic Management', 'Telemedicine', 'Medical Records'],
            'Education Technology' => ['Learning Management', 'School Management', 'Online Courses', 'Exam Platforms'],
            'Marketing & Design' => ['Digital Marketing', 'Branding Services', 'UI/UX Design', 'Content Production'],
            'Cloud & IT Services' => ['Cloud Hosting', 'Cyber Security', 'Data Backup', 'IT Consulting'],
            'E-commerce' => ['Online Stores', 'Payment Solutions', 'Inventory Management', 'Delivery Platforms'],
        ];

        foreach ($catalog as $categoryName => $subcategories) {
            $category = Category::firstOrCreate(
                ['slug' => Str::slug($categoryName)],
                ['name' => $categoryName, 'details' => "Services in {$categoryName}."]
            );

            foreach ($subcategories as $subcategoryName) {
                Category::firstOrCreate(
                    ['parent_id' => $category->id, 'slug' => Str::slug($categoryName.' '.$subcategoryName)],
                    ['name' => $subcategoryName, 'details' => "Solutions for {$subcategoryName}."]
                );
            }
        }

        foreach (['Technology', 'Healthcare', 'Education', 'Finance', 'Manufacturing', 'Retail', 'Logistics', 'Government'] as $name) {
            Industry::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'description' => "Solutions for the {$name} industry.", 'status' => 'active']
            );
        }
    }
}
