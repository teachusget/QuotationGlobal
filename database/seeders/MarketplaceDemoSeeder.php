<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Industry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MarketplaceDemoSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Business Management', 'Human Resources', 'Sales & CRM', 'Accounting & Finance', 'Education',
            'Healthcare', 'Retail & POS', 'Marketing', 'Cyber Security', 'Cloud & IT Infrastructure',
        ];
        $subcategories = [
            'Business Process Automation', 'Payroll & Attendance', 'Lead Management', 'Billing & Invoicing', 'School Management',
            'Clinic Management', 'Inventory Management', 'Digital Marketing', 'Endpoint Security', 'Cloud Storage',
        ];

        foreach ($categories as $index => $name) {
            $category = Category::firstOrCreate(['name' => $name, 'parent_id' => null], [
                'slug' => Str::slug($name).'-demo',
                'details' => 'Explore '.$name.' software and services.',
            ]);
            $subName = $subcategories[$index];
            Category::firstOrCreate(['name' => $subName, 'parent_id' => $category->id], [
                'slug' => Str::slug($subName).'-'.$category->id,
                'details' => 'Solutions for '.$subName.'.',
            ]);
        }

        foreach (['Microsoft', 'Oracle', 'SAP', 'Salesforce', 'Zoho', 'QuickBooks', 'HubSpot', 'Cisco', 'Amazon Web Services', 'Google Cloud'] as $name) {
            Brand::firstOrCreate(['name' => $name], [
                'slug' => Str::slug($name).'-demo',
                'details' => $name.' marketplace products and solutions.',
                'status' => 'approved',
            ]);
        }

        foreach (['Information Technology', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Financial Services', 'Real Estate', 'Logistics', 'Hospitality', 'Professional Services'] as $name) {
            Industry::firstOrCreate(['name' => $name], [
                'slug' => Str::slug($name).'-demo',
                'description' => 'Technology solutions for the '.$name.' industry.',
                'status' => 'active',
            ]);
        }
    }
}
