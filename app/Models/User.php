<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = ['name', 'username', 'email', 'phone', 'company_name', 'company_logo_data', 'address', 'city', 'country', 'password', 'account_type', 'is_blocked', 'last_login_at', 'email_verified_at', 'email_verification_code', 'email_verification_expires_at'];

    protected $hidden = ['password', 'remember_token', 'email_verification_code'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'is_blocked' => 'boolean',
            'email_verification_expires_at' => 'datetime',
        ];
    }

    public function demoRequests() { return $this->hasMany(DemoRequest::class); }
    public function purchaseOrders() { return $this->hasMany(PurchaseOrder::class); }
    public function customerLead() { return $this->hasOne(CustomerLead::class, 'customer_id'); }
    public function vendorProfile() { return $this->hasOne(Vendor::class); }
    public function assignedVendors() { return $this->belongsToMany(Vendor::class, 'user_vendor_assignments')->withTimestamps(); }
    public function assignedBrands() { return $this->belongsToMany(Brand::class, 'user_brand_assignments')->withTimestamps(); }
    public function assignedSubcategories() { return $this->belongsToMany(Category::class, 'user_subcategory_assignments', 'user_id', 'subcategory_id')->withTimestamps(); }

    public function isSuperAdmin(): bool { return $this->hasRole('Super Admin'); }
}
