<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
class RoleController extends Controller {
 public function index(){return response()->json(['data'=>Role::query()->select('roles.*')->selectSub(fn($q)=>$q->from('model_has_roles')->selectRaw('count(*)')->whereColumn('role_id','roles.id'),'users_count')->with('permissions:id,name')->orderBy('name')->get()]);}
 public function store(Request $r){$d=$this->valid($r);$this->ensureAllowed($r,$d['permissions']);$role=Role::create(['name'=>$d['name'],'guard_name'=>'web']);$role->syncPermissions($d['permissions']);Audit::record($r,'role.created',$role,null,$this->snap($role));return response()->json(['message'=>'Role created.','data'=>$role->load('permissions:id,name')],201);}
 public function update(Request $r,Role $role){abort_if($role->name==='Super Admin',422,'Super Admin is immutable.');$d=$this->valid($r,$role);abort_if($role->is_system&&$d['name']!==$role->name,422,'System role names cannot be changed.');$this->ensureAllowed($r,$d['permissions']);$before=$this->snap($role);$role->update(['name'=>$d['name']]);$role->syncPermissions($d['permissions']);Audit::record($r,'role.updated',$role,$before,$this->snap($role));return response()->json(['message'=>'Role updated.','data'=>$role->load('permissions:id,name')]);}
 public function destroy(Request $r,Role $role){abort_if((bool)$role->is_system,422,'System roles cannot be deleted.');abort_if(DB::table('model_has_roles')->where('role_id',$role->id)->exists(),422,'Reassign users before deleting this role.');$before=$this->snap($role);Audit::record($r,'role.deleted',$role,$before,null);$role->delete();return response()->json(['message'=>'Role deleted.']);}
 private function valid(Request $r,?Role $role=null){return $r->validate(['name'=>['required','string','max:100',Rule::unique('roles','name')->ignore($role)],'permissions'=>['required','array'],'permissions.*'=>['string','distinct',Rule::exists('permissions','name')]]);}
 private function snap(Role $role){return ['id'=>$role->id,'name'=>$role->name,'permissions'=>$role->permissions()->pluck('name')->all()];}
 private function ensureAllowed(Request $r,array $permissions){if($r->user()->isSuperAdmin())return;abort_if(collect($permissions)->diff($r->user()->getAllPermissions()->pluck('name'))->isNotEmpty(),403,'You cannot grant permissions you do not have.');}
}
