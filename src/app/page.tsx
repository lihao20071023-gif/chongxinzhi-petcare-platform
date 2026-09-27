'use client';
import { useEffect, useState } from 'react';
import { AppShell, type Tab } from '@/components/app-shell';
import { Dashboard, Knowledge, Monitor, Profile, Reminders } from '@/components/pages';
import { AiButlerPage } from '@/components/ai-butler-page';
import { CarePlanWorkspace } from '@/components/care-plan-workspace';
import { MarketplacePage } from '@/components/marketplace-page';
import { defaults, loadState, saveState, type PersistedState } from '@/lib/local-store';
import { OnboardingModal } from '@/components/onboarding-modal';
import { defaultProfile, PetProfileProvider, type PetProfile } from '@/components/pet-profile-context';
import type { FeatureDestination } from '@/lib/app-navigation';
import { OwnerFeatureHub } from '@/components/owner-feature-hub';

const PROFILE_KEY = 'petcare-pet-profile-v2';
const PROFILES_KEY = 'petcare-pet-profiles-v3';
const ACTIVE_PET_KEY = 'petcare-active-pet-v3';

export default function App() {
  const [tab,setTab] = useState<Tab>('home'); const [reminders,setReminders] = useState(false); const [state,setState] = useState<PersistedState>(defaults); const [ready,setReady] = useState(false);
  const [profile,setProfileState] = useState<PetProfile>(defaultProfile); const [profiles,setProfiles] = useState<PetProfile[]>([]); const [needsOnboarding,setNeedsOnboarding] = useState(false);
  useEffect(() => {
    const directOpen = new URLSearchParams(window.location.search).get('open');
    if (directOpen === 'hospital-match') {
      window.localStorage.setItem('petcare-pending-destination', 'hospital-match');
      setTab('profile');
    } else if (directOpen === 'emergency') {
      window.localStorage.setItem('petcare-pending-destination', 'emergency-hospital');
      setTab('profile');
    }
    setState(loadState());
    try {
      const savedList=window.localStorage.getItem(PROFILES_KEY);
      const legacy=window.localStorage.getItem(PROFILE_KEY);
      const parsed:PetProfile[]=savedList?JSON.parse(savedList):legacy?[JSON.parse(legacy)]:[];
      // Remove the original bundled showcase pet. User-created profiles use timestamp IDs.
      const list=parsed.filter(x=>x.id!=='pet-tuanzai').map(x=>({...x,hospital:x.hospital==='待绑定'?'':x.hospital,doctor:x.doctor==='待绑定'?'':x.doctor,careAuthorization:x.careAuthorization||'not_connected',insuranceStatus:x.insuranceStatus||'not_configured'}));
      if(list.length!==parsed.length)window.localStorage.setItem(PROFILES_KEY,JSON.stringify(list));
      if(list.length){const activeId=window.localStorage.getItem(ACTIVE_PET_KEY);const active=list.find(x=>x.id===activeId)||list[0];setProfiles(list);setProfileState(active);}else setNeedsOnboarding(true);
    } catch {
      setNeedsOnboarding(true);
    }
    setReady(true);
  }, []);
  useEffect(()=>{const handler=(event:Event)=>{const target=(event as CustomEvent<{target:FeatureDestination}>).detail.target;if(target==='reminders'){setReminders(true);setTab('profile');return}if(target==='care-plan'){setReminders(false);setTab('care');return}setReminders(false);setTab(['report','insulin','food','support','hardware','care-network','hospital-match','emergency-hospital','disease-pilot','settings','roles','profile'].includes(target)?'profile':target as Tab)};window.addEventListener('petcare:navigate',handler);return()=>window.removeEventListener('petcare:navigate',handler)},[]);
  const update = (next:PersistedState) => { setState(next); saveState(next); };
  const persistProfiles=(next:PetProfile[],active:PetProfile)=>{setProfiles(next);setProfileState(active);window.localStorage.setItem(PROFILES_KEY,JSON.stringify(next));window.localStorage.setItem(ACTIVE_PET_KEY,active.id);};
  const setProfile=(next:PetProfile)=>persistProfiles(profiles.some(x=>x.id===next.id)?profiles.map(x=>x.id===next.id?next:x):[...profiles,next],next);
  const completeOnboarding = (next:PetProfile) => {persistProfiles([...profiles.filter(x=>x.id!==next.id),next],next);setNeedsOnboarding(false);};
  const selectProfile=(id:string)=>{const next=profiles.find(x=>x.id===id);if(next)persistProfiles(profiles,next);};
  const props = { state, update, setTab, openReminders: () => setReminders(true) };
  return <PetProfileProvider value={{profile,profiles,setProfile,selectProfile,addProfile:completeOnboarding,requestAddProfile:()=>setNeedsOnboarding(true)}}><AppShell tab={tab} setTab={(next) => { setTab(next); setReminders(false); }}><div className={ready ? '' : 'opacity-0'}>{reminders ? <Reminders state={state} update={update} close={() => setReminders(false)}/> : tab === 'home' ? <Dashboard {...props}/> : tab === 'features' ? <OwnerFeatureHub setTab={setTab}/> : tab === 'care' ? <CarePlanWorkspace back={() => setTab('home')}/> : tab === 'monitor' ? <Monitor {...props}/> : tab === 'ai' ? <AiButlerPage/> : tab === 'knowledge' ? <Knowledge/> : tab === 'marketplace'?<MarketplacePage/>:<Profile {...props}/>}</div>{ready && needsOnboarding && <OnboardingModal onComplete={completeOnboarding}/>}</AppShell></PetProfileProvider>;
}
