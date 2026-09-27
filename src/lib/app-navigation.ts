export type FeatureDestination='home'|'monitor'|'ai'|'knowledge'|'marketplace'|'profile'|'report'|'insulin'|'food'|'support'|'reminders'|'care-plan'|'hardware'|'care-network'|'hospital-match'|'emergency-hospital'|'disease-pilot'|'settings'|'roles';
export type FeatureNavigation={destination:FeatureDestination;label:string;description:string};

const routes:{pattern:RegExp;action:FeatureNavigation}[]=[
 {pattern:/24\s*小时.{0,5}急诊|夜间急诊|半夜.{0,6}(医院|急诊|就医)|紧急医院|急诊匹配/,action:{destination:'emergency-hospital',label:'立即打开24小时急诊匹配',description:'只查已核验急诊医院和有效接诊状态；急诊模式不展示广告'}},
 {pattern:/上传.{0,6}报告|拍.{0,4}(报告|病例)|报告识别|化验单|报告趋势|指标曲线/,action:{destination:'report',label:'打开报告识别与趋势',description:'拍摄或上传报告、查看异常和连续指标曲线'}},
 {pattern:/胰岛素|注射记录|血糖记录/,action:{destination:'insulin',label:'打开胰岛素与血糖记录',description:'记录注射时间、处方剂量和血糖，分析是否规律'}},
 {pattern:/宠物粮|狗粮|猫粮|处方粮.{0,4}(识别|拍照)|饮食拍照|粮食识别/,action:{destination:'food',label:'打开宠物粮拍照评估',description:'拍摄包装和营养标签，结合当前疾病判断适配性'}},
 {pattern:/多宠|新增宠物|添加宠物|切换宠物|宠物档案/,action:{destination:'profile',label:'打开多宠健康档案',description:'新增、查看或切换猫犬档案'}},
 {pattern:/人工客服|联系客服|问题反馈|反馈问题|使用问题|产品建议/,action:{destination:'support',label:'打开人工客服',description:'提交使用问题、截图和联系方式，并查看工单状态'}},
 {pattern:/提醒|用药时间|复诊日历|定时任务/,action:{destination:'reminders',label:'打开用药与复查提醒',description:'查看今日用药、复查日历和提醒开关'}},
 {pattern:/每日打卡|健康打卡|记录症状|趋势图表|健康监测/,action:{destination:'monitor',label:'打开健康监测',description:'记录食欲、饮水、排尿、体重和症状'}},
 {pattern:/知识库|护理知识|查知识/,action:{destination:'knowledge',label:'打开慢病知识库',description:'搜索用药、饮食、饮水、急症和检测知识'}},
 {pattern:/护理方案|今天该做什么|今日计划|今日护理清单/,action:{destination:'care-plan',label:'打开今日护理方案',description:'根据当前宠物今天的真实打卡和报告生成可执行安排'}},
 {pattern:/找医院|附近医院|医院匹配|医院特色|医院推荐|医院排名/,action:{destination:'hospital-match',label:'打开医院匹配',description:'按地区、病种和真实服务能力查询已核验医院'}},
 {pattern:/线上医生|医院沟通|转诊|预约挂号|疑难病例|医疗协同/,action:{destination:'care-network',label:'打开医疗协同',description:'整理当前宠物的真实记录，用于预约、转诊和医院协同'}},
 {pattern:/专病试点|试点病例|院外管理|病例闭环|SOP/,action:{destination:'disease-pilot',label:'打开专病试点中心',description:'核对病例入组、医生审核与复查结果闭环'}},
 {pattern:/智能硬件|喂食器|饮水器|猫砂盆|设备绑定|健康项圈/,action:{destination:'hardware',label:'打开智能硬件中心',description:'登记或尝试配对当前宠物的真实健康设备'}},
 {pattern:/商城|买东西|购买|补货|下单|自有品牌/,action:{destination:'marketplace',label:'打开自有品牌商城',description:'查看开发者真实发布并适配当前宠物的商品'}},
 {pattern:/我的页面|个人中心|健康档案/,action:{destination:'profile',label:'打开健康档案',description:'查看当前宠物的疾病、用药和饮食档案'}},
 {pattern:/回首页|打开首页|今日护理/,action:{destination:'home',label:'返回首页',description:'查看今日健康摘要和护理任务'}},
];

export function resolveFeatureNavigation(text:string){return routes.find(x=>x.pattern.test(text))?.action||null;}

export function navigateToFeature(target:FeatureDestination){
 if(typeof window==='undefined')return;
 window.localStorage.setItem('petcare-pending-destination',target);
 window.dispatchEvent(new CustomEvent('petcare:navigate',{detail:{target}}));
}
