export interface Pet { id:string; name:string; species:'cat'|'dog'; breed:string; gender:'male'|'female'; birthDate:string; weight:number; avatar?:string; chronicDiseases?:string[] }
export interface CheckIn { id:string; petId:string; date:string; appetite:'good'|'normal'|'poor'; water:'good'|'normal'|'poor'; activity:'good'|'normal'|'poor'; mood:'good'|'normal'|'poor' }
