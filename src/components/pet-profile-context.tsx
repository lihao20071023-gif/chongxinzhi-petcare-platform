'use client';
import { createContext,useContext } from 'react';
import type { Species } from '@/lib/pet-breeds';

export type PetProfile={id:string;name:string;species:Species;breed:string;breedStatus:string;suspectedAncestry:string;age:string;gender:string;weight:number;bodySize:string;bcs:number;bodyTraits:string[];disease:string;stage:string;diagnosedAt:string;hospital:string;doctor:string;hospitalPhone?:string;hospitalAddress?:string;careAuthorization?:'not_connected'|'pending'|'verified';insuranceProvider?:string;insurancePolicyNo?:string;insurancePhone?:string;insuranceStatus?:'not_configured'|'self_recorded'|'verified_partner';avatar:string};
export const defaultProfile:PetProfile={id:'unconfigured',name:'尚未建档',species:'cat',breed:'未填写',breedStatus:'不确定',suspectedAncestry:'',age:'未填写',gender:'未知',weight:0,bodySize:'待评估',bcs:5,bodyTraits:[],disease:'未填写',stage:'未填写',diagnosedAt:'未填写',hospital:'',doctor:'',careAuthorization:'not_connected',insuranceProvider:'',insurancePolicyNo:'',insuranceStatus:'not_configured',avatar:''};
export type PetProfileContextValue={profile:PetProfile;profiles:PetProfile[];setProfile:(p:PetProfile)=>void;selectProfile:(id:string)=>void;addProfile:(p:PetProfile)=>void;requestAddProfile:()=>void};
const PetContext=createContext<PetProfileContextValue>({profile:defaultProfile,profiles:[],setProfile:()=>{},selectProfile:()=>{},addProfile:()=>{},requestAddProfile:()=>{}});
export const PetProfileProvider=PetContext.Provider;
export function usePetProfile(){return useContext(PetContext);}
