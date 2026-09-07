<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    public const PERMISSIONS = [
        'users.view','users.create','users.update','users.activate','users.deactivate','users.assign_roles','users.send_invite','users.reset_password',
        'roles.view','roles.create','roles.update','roles.delete','roles.assign','roles.manage_permissions','audit_logs.view',
        'vendors.view','vendors.create','vendors.update','vendors.approve','vendors.delete','vendors.impersonate','customers.view','customers.update','customers.assign','customers.follow_up','customers.block','customers.unblock',
        'categories.view','categories.create','categories.update','categories.delete','brands.view','brands.create','brands.update','brands.delete','brands.approve',
        'industries.view','industries.create','industries.update','industries.delete','services.view','services.create','services.update','services.delete',
        'specifications.view','specifications.create','specifications.update','specifications.delete','rfqs.view','rfqs.update','rfqs.quote','rfqs.respond',
        'demos.view','demos.update','demos.moderate','messages.view','messages.send','purchase_orders.view','purchase_orders.create','purchase_orders.assign_vendor','purchase_orders.send',
        'marketplace_builder.view','marketplace_builder.update','marketplace_builder.publish','marketplace_builder.manage_media',
        'settings.manage',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        foreach (self::PERMISSIONS as $name) Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        $super = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web'], ['is_system' => true]);
        $buyer = Role::firstOrCreate(['name' => 'Buyer', 'guard_name' => 'web'], ['is_system' => true]);
        $vendor = Role::firstOrCreate(['name' => 'Vendor', 'guard_name' => 'web'], ['is_system' => true]);
        $super->syncPermissions(Permission::all());
        $buyer->syncPermissions(Permission::whereIn('name', ['rfqs.view','rfqs.respond','demos.view','messages.view','messages.send','purchase_orders.create'])->get());
        $vendor->syncPermissions(Permission::whereIn('name', ['vendors.view','customers.view','categories.view','industries.view','brands.view','brands.create','brands.update','services.view','services.create','services.update','services.delete','rfqs.view','rfqs.quote','demos.view','demos.update','messages.view','messages.send','purchase_orders.view','purchase_orders.send'])->get());

        $email = env('SUPER_ADMIN_EMAIL');
        $password = env('SUPER_ADMIN_PASSWORD');
        if ($email && $password) {
            $admin = User::updateOrCreate(['email' => $email], [
                'name' => env('SUPER_ADMIN_NAME', 'Super Admin'),
                'username' => env('SUPER_ADMIN_USERNAME', 'superadmin'),
                'password' => $password,
                'account_type' => 'staff',
                'email_verified_at' => now(),
                'is_blocked' => false,
            ]);
            $admin->syncRoles([$super]);
        }
    }
}
