'use client';
import { useState } from 'react';
import { ArrowLeft,Building2,Camera,Cat,CheckCircle2,Dog,ShieldCheck } from 'lucide-react';
import { usePetProfile } from './pet-profile-context';
import { Card,PageTitle,SectionTitle } from './ui';

const defaultAvatars={cat:'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=700&q=88',dog:'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=700&q=88'} as const;
function readAvatar(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const image=new Image();image.onerror=reject;image.onload=()=>{const size=640;const scale=Math.max(size/image.width,size/image.height);const width=image.width*scale,height=image.height*scale;const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const context=canvas.getContext('2d');if(!context)return reject(new Error('无法处理图片'));context.drawImage(image,(size-width)/2,(size-height)/2,width,height);resolve(canvas.toDataURL('image/jpeg',.82))};image.src=String(reader.result)};reader.readAsDataURL(file)})}

export function ProfileServiceSettings({back}:{back:()=>void}){
 const {profile,setProfile}=usePetProfile();
 const [form,setForm]=useState({...profile});const [saved,setSaved]=useState(false);const [imageError,setImageError]=useState('');
 const save=()=>{setProfile({...form,hospital:form.hospital.trim(),doctor:form.doctor.trim(),insuranceProvider:form.insuranceProvider?.trim(),insurancePolicyNo:form.insurancePolicyNo?.trim(),careAuthorization:form.careAuthorization||'not_connected',insuranceStatus:form.insuranceProvider?.trim()?'self_recorded':'not_configured'});setSaved(true)};
 const input='mt-2 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#357b5e]';
 return <>
<PageTitle title="医院、医生与保障服务" subtitle={`仅管理${profile.name}由你录入或授权的数据`} action={<button onClick={back} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
<ArrowLeft size={16}/>返回档案</button>}/>
 <Card className="mb-4 border-[#ead19b] bg-[#fff9ed] p-4 text-sm leading-6 text-[#735a2d]">
<b>真实服务边界：</b>填写医院或保险名称只是保存你的联系资料，不代表平台已经与其合作、联网或完成授权。只有医院完成真实接入和身份核验后，状态才可变为“已验证连接”。</Card>
 <Card className="mb-4 p-5">
<SectionTitle>宠物真实基础资料</SectionTitle>
<div className="mb-5 grid gap-4 sm:grid-cols-[180px_1fr]">
<button onClick={()=>document.getElementById('pet-avatar-input')?.click()} className="group relative aspect-square overflow-hidden rounded-2xl border border-[#d6e3db] bg-[#edf4f0]">{form.avatar?<img src={form.avatar} alt={`${form.name}头像`} className="size-full object-cover"/>:<span className="grid size-full place-items-center text-sm text-[#4f7662]">选择照片</span>}<span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/55 py-2 text-xs font-semibold text-white"><Camera size={15}/>更换照片</span></button>
<div><p className="text-sm font-semibold">宠物类型与头像</p><div className="mt-2 grid grid-cols-2 gap-2">{([['cat','猫咪',Cat],['dog','狗狗',Dog]] as const).map(([species,label,Icon])=><button key={species} onClick={()=>setForm({...form,species,avatar:defaultAvatars[species],breed:'',breedStatus:'不确定',bodyTraits:species==='cat'?[]:form.bodyTraits})} className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold ${form.species===species?'border-[#2e7b5c] bg-[#e7f3eb] text-[#256d4e]':'border-[#dfe7e2] text-[#6f7d75]'}`}><Icon size={18}/>{label}</button>)}</div>
<div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>setForm({...form,avatar:defaultAvatars[form.species]})} className="rounded-lg border px-3 py-2 text-xs font-semibold">使用{form.species==='cat'?'猫咪':'狗狗'}默认图片</button><label className="cursor-pointer rounded-lg bg-[#287656] px-3 py-2 text-xs font-semibold text-white"><Camera className="mr-1 inline" size={14}/>上传自家宠物照片<input id="pet-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setImageError('');if(file.size>12*1024*1024){setImageError('图片不能超过12MB');return}try{setForm({...form,avatar:await readAvatar(file)})}catch{setImageError('图片处理失败，请换一张重试')}}}/></label></div>
{imageError&&<p className="mt-2 text-xs font-semibold text-red-700">{imageError}</p>}<p className="mt-3 text-xs leading-5 text-[#718078]">切换猫/狗只修改当前宠物；上传照片仅保存在本机该宠物档案。</p></div></div>
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
<label className="text-sm font-semibold">具体品种<input value={form.breed||''} onChange={e=>setForm({...form,breed:e.target.value})} placeholder={form.species==='cat'?'例如：中华田园猫':'例如：混种犬'} className={input}/></label>
<label className="text-sm font-semibold">宠物名字<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={input}/>
</label>
<label className="text-sm font-semibold">当前实测体重（kg）<input value={form.weight||''} type="number" min="0.1" step="0.1" onChange={e=>setForm({...form,weight:Number(e.target.value)})} className={input}/>
</label>
<label className="text-sm font-semibold">BCS（1-9）<input value={form.bcs} type="number" min="1" max="9" onChange={e=>setForm({...form,bcs:Number(e.target.value)})} className={input}/>
</label>
<label className="text-sm font-semibold">年龄<input value={form.age} onChange={e=>setForm({...form,age:e.target.value})} className={input}/>
</label>
<label className="text-sm font-semibold">已确诊慢病<input value={form.disease||''} onChange={e=>setForm({...form,disease:e.target.value})} placeholder="未确诊请留空" className={input}/>
</label>
<label className="text-sm font-semibold">医院确认的分期<input value={form.stage||''} onChange={e=>setForm({...form,stage:e.target.value})} placeholder="没有结果请留空" className={input}/>
</label>
</div>
<p className="mt-4 text-xs text-[#718078]">保存后作为当前宠物的用户录入数据供AI调用；空白字段保持未知，不从互联网或模板补齐。</p>
</Card>
 <div className="grid gap-4 lg:grid-cols-2">
<Card className="p-5">
<SectionTitle>
<Building2 className="mr-2 inline" size={18}/>专属医院与医生</SectionTitle>
<div className="grid gap-4">
<label className="text-sm font-semibold">医院名称<input value={form.hospital||''} onChange={e=>setForm({...form,hospital:e.target.value,careAuthorization:'not_connected'})} placeholder="由你填写，不提供网络推荐" className={input}/>
</label>
<label className="text-sm font-semibold">主治医生<input value={form.doctor||''} onChange={e=>setForm({...form,doctor:e.target.value,careAuthorization:'not_connected'})} placeholder="由你填写" className={input}/>
</label>
<label className="text-sm font-semibold">医院电话<input value={form.hospitalPhone||''} onChange={e=>setForm({...form,hospitalPhone:e.target.value})} className={input}/>
</label>
<label className="text-sm font-semibold">医院地址<input value={form.hospitalAddress||''} onChange={e=>setForm({...form,hospitalAddress:e.target.value})} className={input}/>
</label>
<label className="text-sm font-semibold">数据状态<select value={form.careAuthorization||'not_connected'} onChange={e=>setForm({...form,careAuthorization:e.target.value as typeof form.careAuthorization})} className={input}>
<option value="not_connected">仅由用户记录 · 未连接</option>
<option value="pending">已申请授权 · 等待医院确认</option>
<option value="verified" disabled>已验证连接（需医院后台核验）</option>
</select>
</label>
</div>
</Card>
 <Card className="p-5">
<SectionTitle>
<ShieldCheck className="mr-2 inline" size={18}/>宠物保险/医疗保障</SectionTitle>
<div className="grid gap-4">
<label className="text-sm font-semibold">保险或保障机构<input value={form.insuranceProvider||''} onChange={e=>setForm({...form,insuranceProvider:e.target.value})} placeholder="只填写你已经购买或签约的机构" className={input}/>
</label>
<label className="text-sm font-semibold">保单号/会员号<input value={form.insurancePolicyNo||''} onChange={e=>setForm({...form,insurancePolicyNo:e.target.value})} className={input}/>
</label>
<label className="text-sm font-semibold">理赔联系电话<input value={form.insurancePhone||''} onChange={e=>setForm({...form,insurancePhone:e.target.value})} className={input}/>
</label>
<div className="rounded-xl bg-[#f3f6f4] p-3 text-xs leading-5 text-[#65756c]">当前功能用于个人记录和就诊时快速查看，不会声称与任何保险公司合作，也不会自动提交理赔。正式合作需签署协议并接入对方API后开放。</div>
</div>
</Card>
</div>
 <button onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#287656] py-3 font-semibold text-white">
<CheckCircle2 size={18}/>{saved?'已保存并可供AI读取':'保存真实资料'}</button>
</>;
}
