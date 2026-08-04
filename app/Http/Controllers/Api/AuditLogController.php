<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
class AuditLogController extends Controller { public function index(Request $r){$q=AuditLog::with('actor:id,name,email')->latest('created_at');$q->when($r->action,fn($x,$v)=>$x->where('action','like',"{$v}%"))->when($r->actor_id,fn($x,$v)=>$x->where('actor_id',$v))->when($r->target_type,fn($x,$v)=>$x->where('target_type',$v));return response()->json($q->paginate(min((int)$r->input('per_page',30),100)));} }
