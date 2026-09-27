export type SupportTicket={id:string;createdAt:string;petId:string;petName:string;category:string;subject:string;description:string;contact:string;page:string;attachmentNames:string[];status:'待同步'|'已提交'|'处理中'|'已解决'};
const key='petcare-support-tickets-v1';
export function loadSupportTickets():SupportTicket[]{if(typeof window==='undefined')return[];try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}}
export function saveSupportTicket(ticket:SupportTicket){const next=[ticket,...loadSupportTickets()].slice(0,50);localStorage.setItem(key,JSON.stringify(next));return next}

// Static builds have no private server credentials. Replace this adapter with the production support API.
export async function submitSupportTicket(ticket:SupportTicket){
 const endpoint=process.env.NEXT_PUBLIC_SUPPORT_API_URL;
 if(!endpoint)return{synced:false as const,ticket:{...ticket,status:'待同步' as const}};
 try{const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(ticket)});if(!response.ok)throw new Error('support api failed');return{synced:true as const,ticket:{...ticket,status:'已提交' as const}}}catch{return{synced:false as const,ticket:{...ticket,status:'待同步' as const}}}
}
