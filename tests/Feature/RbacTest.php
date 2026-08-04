<?php
namespace Tests\Feature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
class RbacTest extends TestCase {
 use RefreshDatabase;
 private function user(string $type='staff'):User{return User::create(['name'=>'Test User','email'=>uniqid().'@example.com','password'=>'password123','account_type'=>$type]);}
 public function test_permissions_are_unioned_across_multiple_roles():void{$user=$this->user();$a=Role::create(['name'=>'A','guard_name'=>'web']);$b=Role::create(['name'=>'B','guard_name'=>'web']);$a->givePermissionTo(Permission::findByName('users.view'));$b->givePermissionTo(Permission::findByName('roles.view'));$user->syncRoles([$a,$b]);$this->assertTrue($user->can('users.view'));$this->assertTrue($user->can('roles.view'));}
 public function test_vendor_without_user_permission_is_denied():void{$user=$this->user('vendor');$user->assignRole('Vendor');Sanctum::actingAs($user);$this->getJson('/api/users')->assertForbidden();}
 public function test_roles_endpoint_includes_assigned_user_counts():void{$user=$this->user();$user->assignRole('Super Admin');Sanctum::actingAs($user);$this->getJson('/api/roles')->assertOk()->assertJsonFragment(['name'=>'Super Admin','users_count'=>1]);}
 public function test_last_active_super_admin_cannot_be_deactivated():void{$user=$this->user();$user->assignRole('Super Admin');Sanctum::actingAs($user);$this->patchJson("/api/users/{$user->id}/status",['active'=>false])->assertStatus(422);$this->assertFalse($user->fresh()->is_blocked);}
}
