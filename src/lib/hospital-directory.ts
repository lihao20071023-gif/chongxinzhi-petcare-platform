export const HOSPITAL_DIRECTORY_STORAGE_KEY = 'petcare-hospital-directory-v1';
export const HOSPITAL_DIRECTORY_UPDATED_EVENT = 'petcare:hospital-directory-updated';

export type HospitalSourceStatus = 'self_submitted' | 'verified' | 'rejected';
export type HospitalEmergencyCapability = 'none' | 'business_hours' | '24_hours';
export type HospitalDistancePreference = 'same_district_first' | 'citywide';
export type HospitalCoordinateSource = 'hospital_confirmed' | 'map_provider_verified';
export type HospitalPromotionReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paused';
export type HospitalEmergencyLiveState = 'accepting' | 'limited' | 'unavailable';

export type HospitalCoordinates = {
  latitude: number;
  longitude: number;
  source: HospitalCoordinateSource;
  verifiedAt: string;
};

export type HospitalPromotion = {
  active: boolean;
  reviewStatus?: HospitalPromotionReviewStatus;
  label?: string;
  disclosure?: string;
  title?: string;
  targetDistrict?: string;
  startsAt?: string;
  endsAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type HospitalEmergencyLiveStatus = {
  state: HospitalEmergencyLiveState;
  source: 'hospital_update';
  updatedAt: string;
  validUntil: string;
  onDutyPhone?: string;
  capabilities: string[];
  note?: string;
};

/**
 * A directory item contains only information submitted by a hospital and reviewed
 * by the platform. `sourceStatus` is the only authority used by the owner view:
 * self-submitted and rejected items are never returned as owner-visible matches.
 */
export type HospitalDirectoryEntry = {
  id: string;
  name: string;
  legalEntityName?: string;
  animalDiagnosisLicenseNo?: string;
  licenseScope?: string;
  licenseExpiresOn?: string;
  city: string;
  district: string;
  address?: string;
  contactPhone?: string;
  businessHours?: string;
  introduction?: string;
  supportedSpecies: Array<'cat' | 'dog'>;
  specialties: string[];
  specialtyEvidence?: string;
  diseaseCapabilities: string[];
  serviceCapabilities: string[];
  equipmentCapabilities: string[];
  priceNote?: string;
  emergencyCapability: HospitalEmergencyCapability;
  emergencyLiveStatus?: HospitalEmergencyLiveStatus;
  coordinates?: HospitalCoordinates;
  sourceStatus: HospitalSourceStatus;
  submittedAt: string;
  updatedAt: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  reviewerNote?: string;
  promotion?: HospitalPromotion;
};

export type HospitalSubmissionInput = {
  id?: string;
  name: string;
  legalEntityName?: string;
  animalDiagnosisLicenseNo?: string;
  licenseScope?: string;
  licenseExpiresOn?: string;
  city: string;
  district: string;
  address?: string;
  contactPhone?: string;
  businessHours?: string;
  introduction?: string;
  supportedSpecies?: Array<'cat' | 'dog'>;
  specialties?: string[];
  specialtyEvidence?: string;
  diseaseCapabilities?: string[];
  serviceCapabilities?: string[];
  equipmentCapabilities?: string[];
  priceNote?: string;
  emergencyCapability?: HospitalEmergencyCapability;
  coordinates?: HospitalCoordinates;
};

export type HospitalReviewInput = {
  status: Extract<HospitalSourceStatus, 'verified' | 'rejected'>;
  reason?: string;
  reviewerNote?: string;
  reviewedAt?: string;
};

export type HospitalMatchQuery = {
  city: string;
  district?: string;
  careNeed?: string;
  species?: 'cat' | 'dog';
  emergencyRequired: boolean;
  distancePreference: HospitalDistancePreference;
};

export type HospitalMatchResult = {
  hospital: HospitalDirectoryEntry;
  reasons: string[];
  limitations: string[];
};

const STATUS: HospitalSourceStatus[] = ['self_submitted', 'verified', 'rejected'];
const EMERGENCY: HospitalEmergencyCapability[] = ['none', 'business_hours', '24_hours'];

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const optionalText = (value: unknown) => text(value) || undefined;
const list = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.map(text).filter(Boolean))].slice(0, 60)
  : [];

function normalizeCoordinates(value: unknown): HospitalCoordinates | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Partial<HospitalCoordinates>;
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;
  if (item.source !== 'hospital_confirmed' && item.source !== 'map_provider_verified') return undefined;
  const verifiedAt = text(item.verifiedAt);
  if (!verifiedAt) return undefined;
  return { latitude, longitude, source: item.source, verifiedAt };
}

function normalizePromotion(value: unknown): HospitalPromotion | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Partial<HospitalPromotion>;
  return {
    active: item.active === true,
    reviewStatus: ['draft', 'pending', 'approved', 'rejected', 'paused'].includes(item.reviewStatus || '')
      ? item.reviewStatus
      : 'draft',
    label: optionalText(item.label),
    disclosure: optionalText(item.disclosure),
    title: optionalText(item.title),
    targetDistrict: optionalText(item.targetDistrict),
    startsAt: optionalText(item.startsAt),
    endsAt: optionalText(item.endsAt),
    submittedAt: optionalText(item.submittedAt),
    reviewedAt: optionalText(item.reviewedAt),
    reviewNote: optionalText(item.reviewNote),
  };
}

function normalizeEmergencyLiveStatus(value: unknown): HospitalEmergencyLiveStatus | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Partial<HospitalEmergencyLiveStatus>;
  if (item.state !== 'accepting' && item.state !== 'limited' && item.state !== 'unavailable') return undefined;
  const updatedAt = text(item.updatedAt);
  const validUntil = text(item.validUntil);
  if (!updatedAt || !validUntil || Number.isNaN(Date.parse(updatedAt)) || Number.isNaN(Date.parse(validUntil))) return undefined;
  return {
    state: item.state,
    source: 'hospital_update',
    updatedAt,
    validUntil,
    onDutyPhone: optionalText(item.onDutyPhone),
    capabilities: list(item.capabilities),
    note: optionalText(item.note),
  };
}

function normalizeEntry(value: unknown): HospitalDirectoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<HospitalDirectoryEntry>;
  const id = text(item.id);
  const name = text(item.name);
  const city = text(item.city);
  const district = text(item.district);
  const sourceStatus = STATUS.includes(item.sourceStatus as HospitalSourceStatus)
    ? item.sourceStatus as HospitalSourceStatus
    : null;
  if (!id || !name || !city || !district || !sourceStatus) return null;
  const submittedAt = text(item.submittedAt) || new Date(0).toISOString();
  const updatedAt = text(item.updatedAt) || submittedAt;
  return {
    id,
    name,
    legalEntityName: optionalText(item.legalEntityName),
    animalDiagnosisLicenseNo: optionalText(item.animalDiagnosisLicenseNo),
    licenseScope: optionalText(item.licenseScope),
    licenseExpiresOn: optionalText(item.licenseExpiresOn),
    city,
    district,
    address: optionalText(item.address),
    contactPhone: optionalText(item.contactPhone),
    businessHours: optionalText(item.businessHours),
    introduction: optionalText(item.introduction),
    supportedSpecies: list(item.supportedSpecies).filter((species): species is 'cat' | 'dog' => species === 'cat' || species === 'dog'),
    specialties: list(item.specialties),
    specialtyEvidence: optionalText(item.specialtyEvidence),
    diseaseCapabilities: list(item.diseaseCapabilities),
    serviceCapabilities: list(item.serviceCapabilities),
    equipmentCapabilities: list(item.equipmentCapabilities),
    priceNote: optionalText(item.priceNote),
    emergencyCapability: EMERGENCY.includes(item.emergencyCapability as HospitalEmergencyCapability)
      ? item.emergencyCapability as HospitalEmergencyCapability
      : 'none',
    emergencyLiveStatus: normalizeEmergencyLiveStatus(item.emergencyLiveStatus),
    coordinates: normalizeCoordinates(item.coordinates),
    sourceStatus,
    submittedAt,
    updatedAt,
    verifiedAt: optionalText(item.verifiedAt),
    rejectedAt: optionalText(item.rejectedAt),
    rejectionReason: optionalText(item.rejectionReason),
    reviewerNote: optionalText(item.reviewerNote),
    promotion: normalizePromotion(item.promotion),
  };
}

function availableStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadHospitalDirectory(): HospitalDirectoryEntry[] {
  if (!availableStorage()) return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(HOSPITAL_DIRECTORY_STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeEntry).filter((item): item is HospitalDirectoryEntry => Boolean(item));
  } catch {
    return [];
  }
}

export function saveHospitalDirectory(entries: HospitalDirectoryEntry[]): HospitalDirectoryEntry[] {
  const normalized = entries.map(normalizeEntry).filter((item): item is HospitalDirectoryEntry => Boolean(item));
  const unique = [...new Map(normalized.map(item => [item.id, item])).values()];
  if (availableStorage()) {
    window.localStorage.setItem(HOSPITAL_DIRECTORY_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new CustomEvent(HOSPITAL_DIRECTORY_UPDATED_EVENT));
  }
  return unique;
}

/** Hospital-side submit/update. Every edit returns to self_submitted for a new review. */
export function submitHospitalDirectoryEntry(input: HospitalSubmissionInput): HospitalDirectoryEntry {
  const name = text(input.name);
  const city = text(input.city);
  const district = text(input.district);
  if (!name || !city || !district) throw new Error('医院名称、城市和区域为必填项。');
  const all = loadHospitalDirectory();
  const id = text(input.id) || `hospital-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existing = all.find(item => item.id === id);
  const now = new Date().toISOString();
  const entry: HospitalDirectoryEntry = {
    id,
    name,
    legalEntityName: optionalText(input.legalEntityName),
    animalDiagnosisLicenseNo: optionalText(input.animalDiagnosisLicenseNo),
    licenseScope: optionalText(input.licenseScope),
    licenseExpiresOn: optionalText(input.licenseExpiresOn),
    city,
    district,
    address: optionalText(input.address),
    contactPhone: optionalText(input.contactPhone),
    businessHours: optionalText(input.businessHours),
    introduction: optionalText(input.introduction),
    supportedSpecies: list(input.supportedSpecies).filter((species): species is 'cat' | 'dog' => species === 'cat' || species === 'dog'),
    specialties: list(input.specialties),
    specialtyEvidence: optionalText(input.specialtyEvidence),
    diseaseCapabilities: list(input.diseaseCapabilities),
    serviceCapabilities: list(input.serviceCapabilities),
    equipmentCapabilities: list(input.equipmentCapabilities),
    priceNote: optionalText(input.priceNote),
    emergencyCapability: EMERGENCY.includes(input.emergencyCapability as HospitalEmergencyCapability)
      ? input.emergencyCapability as HospitalEmergencyCapability
      : 'none',
    coordinates: normalizeCoordinates(input.coordinates),
    sourceStatus: 'self_submitted',
    submittedAt: existing?.submittedAt || now,
    updatedAt: now,
  };
  saveHospitalDirectory([entry, ...all.filter(item => item.id !== id)]);
  return entry;
}

/** Developer-side review. Rejection reasons remain internal and are not owner-visible. */
export function reviewHospitalDirectoryEntry(id: string, review: HospitalReviewInput): HospitalDirectoryEntry | null {
  const all = loadHospitalDirectory();
  const current = all.find(item => item.id === id);
  if (!current) return null;
  const reviewedAt = text(review.reviewedAt) || new Date().toISOString();
  const next: HospitalDirectoryEntry = {
    ...current,
    sourceStatus: review.status,
    updatedAt: reviewedAt,
    verifiedAt: review.status === 'verified' ? reviewedAt : undefined,
    rejectedAt: review.status === 'rejected' ? reviewedAt : undefined,
    rejectionReason: review.status === 'rejected' ? optionalText(review.reason) : undefined,
    reviewerNote: optionalText(review.reviewerNote),
  };
  saveHospitalDirectory(all.map(item => item.id === id ? next : item));
  return next;
}

/** Developer-side promotion control. Promotion never changes matching scores. */
export function setHospitalPromotion(id: string, promotion?: HospitalPromotion): HospitalDirectoryEntry | null {
  const all = loadHospitalDirectory();
  const current = all.find(item => item.id === id);
  if (!current) return null;
  const next = { ...current, promotion: promotion ? normalizePromotion(promotion) : undefined, updatedAt: new Date().toISOString() };
  saveHospitalDirectory(all.map(item => item.id === id ? next : item));
  return next;
}

/** Hospital-side request. A request is never owner-visible until a platform review approves it. */
export function submitHospitalPromotion(id: string, input: Omit<HospitalPromotion, 'active' | 'reviewStatus' | 'submittedAt' | 'reviewedAt' | 'reviewNote'>): HospitalDirectoryEntry | null {
  return setHospitalPromotion(id, {
    ...input,
    active: false,
    reviewStatus: 'pending',
    label: '广告',
    submittedAt: new Date().toISOString(),
  });
}

/** Developer-side review. Approval only activates ads for already verified hospitals. */
export function reviewHospitalPromotion(id: string, approved: boolean, reviewNote?: string): HospitalDirectoryEntry | null {
  const all = loadHospitalDirectory();
  const current = all.find(item => item.id === id);
  if (!current?.promotion) return null;
  const canActivate = approved && current.sourceStatus === 'verified';
  return setHospitalPromotion(id, {
    ...current.promotion,
    active: canActivate,
    reviewStatus: canActivate ? 'approved' : 'rejected',
    label: '广告',
    reviewedAt: new Date().toISOString(),
    reviewNote: optionalText(reviewNote),
  });
}

/** Hospital-side operational status. Updates expire automatically and never alter profile verification. */
export function updateHospitalEmergencyAvailability(
  id: string,
  input: {
    state: HospitalEmergencyLiveState;
    onDutyPhone?: string;
    capabilities?: string[];
    note?: string;
    validMinutes?: number;
  },
): HospitalDirectoryEntry | null {
  const all = loadHospitalDirectory();
  const current = all.find(item => item.id === id);
  if (!current || current.sourceStatus !== 'verified' || current.emergencyCapability === 'none') return null;
  const now = new Date();
  const validMinutes = Math.min(180, Math.max(15, Number(input.validMinutes) || 60));
  const next: HospitalDirectoryEntry = {
    ...current,
    emergencyLiveStatus: {
      state: input.state,
      source: 'hospital_update',
      updatedAt: now.toISOString(),
      validUntil: new Date(now.getTime() + validMinutes * 60_000).toISOString(),
      onDutyPhone: optionalText(input.onDutyPhone),
      capabilities: list(input.capabilities),
      note: optionalText(input.note),
    },
    updatedAt: now.toISOString(),
  };
  saveHospitalDirectory(all.map(item => item.id === id ? next : item));
  return next;
}

export function getEffectiveEmergencyAvailability(hospital: HospitalDirectoryEntry, now = new Date()) {
  const status = hospital.emergencyLiveStatus;
  if (!status || Date.parse(status.validUntil) <= now.getTime()) {
    return { state: 'unknown' as const, reason: status ? '医院上次接诊状态已过期，请电话确认' : '医院尚未更新实时接诊状态，请电话确认' };
  }
  return { state: status.state, status, reason: status.note };
}

export function getVerifiedHospitals(entries = loadHospitalDirectory()): HospitalDirectoryEntry[] {
  return entries.filter(item => item.sourceStatus === 'verified');
}

const simplify = (value: string) => value.toLocaleLowerCase('zh-CN').replace(/[\s\-_/（）()·]/g, '');

const NEED_GROUPS = [
  ['慢性肾病', 'ckd', '肾病', '肾衰', '肾内科', '肾脏'],
  ['糖尿病', '血糖', '内分泌'],
  ['心脏病', '心脏', '心内科'],
  ['肿瘤', '肿瘤科', '癌症'],
  ['皮肤病', '皮肤科', '过敏'],
  ['骨科', '骨折', '关节', '外科'],
  ['神经', '神经科', '癫痫'],
  ['口腔', '牙科', '牙齿'],
  ['眼科', '眼病', '眼睛'],
  ['消化', '胃肠', '胰腺', '肝胆'],
];

function needTerms(need: string) {
  const target = simplify(need);
  const group = NEED_GROUPS.find(items => items.some(item => target.includes(simplify(item)) || simplify(item).includes(target)));
  return [...new Set([need, ...(group || [])].map(simplify).filter(Boolean))];
}

function matchedCapabilities(hospital: HospitalDirectoryEntry, careNeed: string) {
  if (!text(careNeed)) return [];
  const terms = needTerms(careNeed);
  return [...hospital.diseaseCapabilities, ...hospital.specialties, ...hospital.serviceCapabilities]
    .filter(capability => {
      const candidate = simplify(capability);
      return terms.some(term => candidate.includes(term) || term.includes(candidate));
    });
}

/**
 * Natural matching is capability-first. Promotion is deliberately absent from
 * this function so a paid placement can never alter the result order.
 */
export function matchVerifiedHospitals(query: HospitalMatchQuery, entries = loadHospitalDirectory()): HospitalMatchResult[] {
  const city = text(query.city);
  if (!city) return [];
  const district = text(query.district);
  const careNeed = text(query.careNeed);
  const species = query.species;
  return getVerifiedHospitals(entries)
    .filter(hospital => hospital.city === city)
    .filter(hospital => !species || hospital.supportedSpecies.length === 0 || hospital.supportedSpecies.includes(species))
    .map(hospital => {
      const capabilities = matchedCapabilities(hospital, careNeed);
      const liveEmergency = getEffectiveEmergencyAvailability(hospital);
      if (careNeed && capabilities.length === 0) return null;
      if (query.emergencyRequired && hospital.emergencyCapability === 'none') return null;
      if (query.emergencyRequired && liveEmergency.state === 'unavailable') return null;
      if (query.emergencyRequired && hospital.emergencyCapability === 'business_hours' && liveEmergency.state === 'unknown') return null;
      let score = careNeed ? 70 + Math.min(capabilities.length, 4) * 4 : 0;
      const reasons: string[] = [];
      if (species && hospital.supportedSpecies.includes(species)) reasons.push(`已核验资料显示接诊${species === 'cat' ? '猫' : '犬'}`);
      if (capabilities.length) reasons.push(`已核验资料包含相关能力：${capabilities.slice(0, 3).join('、')}`);
      if (query.emergencyRequired) {
        if (liveEmergency.state === 'accepting') {
          score += 80;
          reasons.push('医院在有效时间内更新为“当前可接急诊”');
        } else if (liveEmergency.state === 'limited') {
          score += 45;
          reasons.push('医院在有效时间内更新为“接诊能力有限”，必须先电话确认');
        }
        if (hospital.emergencyCapability === '24_hours') {
          score += 35;
          reasons.push('医院登记提供 24 小时急诊；出发前仍建议电话确认');
        } else {
          score += 20;
          reasons.push('医院登记提供营业时段急诊；请先确认当前是否接诊');
        }
      }
      const sameDistrict = Boolean(district && hospital.district === district);
      if (sameDistrict) {
        if (query.distancePreference === 'same_district_first') score += 15;
        reasons.push(`位于所选的${district}；这是区域匹配，不代表实际路程`);
      }
      if (!reasons.length) reasons.push('位于所选城市，医院资料已通过平台审核');
      const limitations: string[] = ['当前未获得你的真实定位，不计算公里数或预计到达时间'];
      if (query.emergencyRequired && liveEmergency.state === 'unknown') limitations.push(liveEmergency.reason);
      if (!hospital.coordinates) limitations.push('医院也尚未接入经核验的地图坐标');
      if (!hospital.contactPhone) limitations.push('暂未提供可核验联系电话，请勿直接前往');
      return { hospital, reasons, limitations, score };
    })
    .filter((item): item is HospitalMatchResult & { score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score || a.hospital.name.localeCompare(b.hospital.name, 'zh-CN'))
    .map(({ score: _score, ...result }) => result);
}

function promotionIsActive(promotion: HospitalPromotion | undefined, now: Date) {
  if (!promotion?.active || promotion.reviewStatus !== 'approved') return false;
  const time = now.getTime();
  const start = promotion.startsAt ? Date.parse(promotion.startsAt) : Number.NEGATIVE_INFINITY;
  const end = promotion.endsAt ? Date.parse(promotion.endsAt) : Number.POSITIVE_INFINITY;
  if ((promotion.startsAt && Number.isNaN(start)) || (promotion.endsAt && Number.isNaN(end))) return false;
  return time >= start && time <= end;
}

/** Paid exposure is returned separately and sorted alphabetically, never by bid. */
export function getActivePromotedHospitals(city: string, district = '', entries = loadHospitalDirectory(), now = new Date()) {
  const selectedCity = text(city);
  const selectedDistrict = text(district);
  if (!selectedCity) return [];
  return getVerifiedHospitals(entries)
    .filter(hospital => hospital.city === selectedCity && promotionIsActive(hospital.promotion, now))
    .filter(hospital => !hospital.promotion?.targetDistrict || !selectedDistrict || hospital.promotion.targetDistrict === selectedDistrict)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
