export type Species='cat'|'dog';
export type BreedOption={name:string;aliases?:string[]};

export const catBreeds:BreedOption[]=[
  {name:'阿比西尼亚猫'},{name:'美国短毛猫',aliases:['美短猫','美短']},{name:'美国硬毛猫'},{name:'英国短毛猫',aliases:['英短猫','英短']},{name:'英国长毛猫'},{name:'英国银渐层',aliases:['银渐层']},{name:'英国金渐层',aliases:['金渐层']},{name:'异国短毛猫',aliases:['异国猫','加菲猫']},{name:'波斯猫'},{name:'布偶猫'},{name:'伯曼猫'},{name:'巴厘猫'},{name:'孟买猫'},{name:'暹罗猫'},{name:'东方短毛猫',aliases:['东方猫']},{name:'德文卷毛猫'},{name:'柯尼斯卷毛猫'},{name:'塞尔凯克卷毛猫'},{name:'拉邦猫'},{name:'拉格多尔猫'},{name:'曼切堪猫',aliases:['曼基康猫','短腿猫']},{name:'曼岛猫'},{name:'缅甸猫'},{name:'缅因猫'},{name:'缅甸圣猫'},{name:'俄罗斯蓝猫'},{name:'哈瓦那棕毛猫'},{name:'加拿大无毛猫',aliases:['斯芬克斯猫']},{name:'彼得秃猫'},{name:'重点色短毛猫'},{name:'喜马拉雅猫'},{name:'日本短尾猫'},{name:'美国短尾猫'},{name:'美国卷耳猫'},{name:'挪威森林猫'},{name:'西伯利亚猫'},{name:'索马里猫'},{name:'苏格兰折耳猫'},{name:'土耳其安哥拉猫'},{name:'土耳其梵猫'},{name:'新加坡猫'},{name:'雪鞋猫'},{name:'埃及猫'},{name:'奥西猫'},{name:'孟加拉猫'},{name:'狸花猫',aliases:['中国狸花猫']},{name:'山东狮子猫'},{name:'中华田园猫'},{name:'美国孟加拉猫'},{name:'欧洲缅甸猫'},{name:'内华达猫'},{name:'阿什拉猫'},{name:'沙特尔猫'},{name:'科拉特猫'},{name:'热带草原猫',aliases:['萨凡纳猫']},{name:'玩具虎猫'},{name:'塞伦盖蒂猫'},{name:'混种猫/串串猫'},{name:'其他/自定义'}
];

export const dogBreeds:BreedOption[]=[
  {name:'中华田园犬'},{name:'混种犬/串串犬'},{name:'拉布拉多寻回犬',aliases:['拉布拉多']},{name:'金毛寻回犬',aliases:['金毛犬','金毛']},{name:'德国牧羊犬'},{name:'边境牧羊犬',aliases:['边牧犬','边牧']},{name:'古代英国牧羊犬'},{name:'喜乐蒂牧羊犬'},{name:'苏格兰牧羊犬'},{name:'比利时牧羊犬'},{name:'澳大利亚牧羊犬'},{name:'澳大利亚牧牛犬'},{name:'匈牙利牧羊犬'},{name:'英国斗牛犬'},{name:'法国斗牛犬'},{name:'美国斗牛犬'},{name:'波士顿梗'},{name:'牛头梗'},{name:'迷你牛头梗'},{name:'约克夏梗'},{name:'西高地白梗'},{name:'苏格兰梗'},{name:'万能梗'},{name:'杰克罗素梗'},{name:'凯利蓝梗'},{name:'威尔士梗'},{name:'短脚长身梗'},{name:'雪纳瑞'},{name:'迷你雪纳瑞'},{name:'巨型雪纳瑞'},{name:'贵宾犬',aliases:['泰迪犬','泰迪']},{name:'比熊犬'},{name:'博美犬'},{name:'蝴蝶犬'},{name:'吉娃娃'},{name:'马尔济斯犬'},{name:'巴哥犬'},{name:'北京犬',aliases:['京巴犬']},{name:'西施犬'},{name:'日本狆'},{name:'中国冠毛犬'},{name:'哈士奇',aliases:['西伯利亚雪橇犬']},{name:'阿拉斯加雪橇犬'},{name:'萨摩耶犬'},{name:'爱尔兰雪达犬'},{name:'爱尔兰猎狼犬'},{name:'阿富汗猎犬'},{name:'灵缇犬'},{name:'意大利灵缇'},{name:'惠比特犬'},{name:'苏俄猎狼犬'},{name:'寻血猎犬'},{name:'巴吉度犬'},{name:'比格犬'},{name:'腊肠犬'},{name:'美国可卡犬'},{name:'英国可卡犬'},{name:'史宾格犬'},{name:'秋田犬'},{name:'柴犬'},{name:'松狮犬'},{name:'大白熊犬'},{name:'圣伯纳犬'},{name:'伯恩山犬'},{name:'纽芬兰犬'},{name:'杜宾犬'},{name:'罗威纳犬'},{name:'拳师犬'},{name:'大丹犬'},{name:'卡斯罗犬'},{name:'高加索犬'},{name:'藏獒'},{name:'马士提夫犬'},{name:'牛头獒'},{name:'杜高犬'},{name:'坎高犬'},{name:'德国宾莎犬'},{name:'巴仙吉犬'},{name:'贝灵顿梗'},{name:'湖畔梗'},{name:'猎狐梗'},{name:'曼彻斯特梗'},{name:'葡萄牙水犬'},{name:'卷毛寻回犬'},{name:'平毛寻回犬'},{name:'新斯科舍猎鸭犬'},{name:'维兹拉犬'},{name:'魏玛犬'},{name:'德国短毛指示犬'},{name:'英国指示犬'},{name:'斑点犬'},{name:'沙皮犬'},{name:'可蒙犬'},{name:'伯瑞犬'},{name:'柯基犬',aliases:['威尔士柯基','彭布罗克威尔士柯基','卡迪根威尔士柯基']},{name:'法老王猎犬'},{name:'伊比赞猎犬'},{name:'其他/自定义'}
];

const catBreedAdditions:BreedOption[]=[
  {name:'波米拉猫'},{name:'东奇尼猫'},{name:'金吉拉猫'},{name:'褴褛猫'},{name:'威尔士猫'},{name:'巴黎猫'},{name:'土猫',aliases:['中华田园猫']},{name:'卡尔特猫',aliases:['沙特尔猫']}
];

const dogBreedAdditions:BreedOption[]=[
  {name:'爱尔兰猎狼犬'},{name:'爱尔兰雪达犬'},{name:'阿富汗猎犬'},{name:'阿拉斯加雪橇犬'},{name:'波利犬'},{name:'波尔多犬'},{name:'波音达犬'},{name:'贝林顿梗'},{name:'大麦町犬',aliases:['斑点犬']},{name:'斗牛獒犬'},{name:'刚毛猎狐梗'},{name:'戈登雪达犬'},{name:'荷兰毛狮犬'},{name:'巨型贵宾犬'},{name:'可卡犬'},{name:'昆明犬'},{name:'拉萨犬'},{name:'迷你杜宾犬'},{name:'迷你贝吉犬'},{name:'马士提夫獒犬'},{name:'那不勒斯獒犬'},{name:'萨路基猎犬'},{name:'丝毛梗'},{name:'泰迪犬',aliases:['贵宾犬','泰迪']},{name:'威尔士柯基犬'},{name:'英国猎狐犬'},{name:'英国跳猎犬'},{name:'银狐犬'}
];

export function searchBreeds(species:Species,query:string){const list=species==='cat'?[...catBreeds,...catBreedAdditions]:[...dogBreeds,...dogBreedAdditions];const q=query.trim().toLowerCase();if(!q)return list;return list.filter(x=>[x.name,...(x.aliases||[])].some(v=>v.toLowerCase().includes(q)));}
