import { authHeaders } from '../auth/session'
async function request(url, options={}) { const response=await fetch(url,{...options,headers:{Accept:'application/json','Content-Type':'application/json',...authHeaders(),...options.headers}}); const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.errors?Object.values(data.errors).flat()[0]:data.message||'Inventory request failed.'); return data }
export const getInventory=(search='')=>request(`/api/inventory?${new URLSearchParams(search?{search}:{})}`)
export const updateInventory=(id,payload)=>request(`/api/inventory/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
