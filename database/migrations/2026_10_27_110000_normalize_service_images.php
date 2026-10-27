<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $seen = [];
        $deleteIds = [];

        DB::table('service_images as image')
            ->join('services as service', 'service.id', '=', 'image.service_id')
            ->orderBy('service.id')
            ->orderBy('image.id')
            ->get([
                'image.id',
                'image.image_data',
                'image.sort_order',
                'service.vendor_id',
                'service.name',
                'service.service_type',
            ])
            ->each(function ($image) use (&$seen, &$deleteIds) {
                $key = implode('|', [
                    $image->vendor_id,
                    $image->name,
                    $image->service_type,
                    $image->sort_order,
                    hash('sha256', $image->image_data),
                ]);

                if (isset($seen[$key])) {
                    $deleteIds[] = $image->id;
                    return;
                }

                $seen[$key] = $image->id;
            });

        foreach (array_chunk($deleteIds, 500) as $ids) {
            DB::table('service_images')->whereIn('id', $ids)->delete();
        }
    }

    public function down(): void
    {
    }
};
