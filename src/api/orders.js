import { authHeaders } from '../auth/session'
async function request(url, options={}) { const response=await fetch(url,{...options,headers:{Accept:'application/json','Content-Type':'application/json',...authHeaders(),...options.headers}}); const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.errors?Object.values(data.errors).flat()[0]:data.message||'Order request failed.'); return data }
export const placeOrder=(payload)=>request('/api/orders',{method:'POST',body:JSON.stringify(payload)})
export const getOrders=(params={})=>request(`/api/orders?${new URLSearchParams(Object.entries(params).filter(([,v])=>v!==''&&v!=null))}`)
export const updateOrderStatus=(id,payload)=>request(`/api/orders/${id}/status`,{method:'PATCH',body:JSON.stringify(payload)})
