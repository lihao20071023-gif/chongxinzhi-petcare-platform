import { ArrowLeft, CheckCircle2, CircleAlert, Palette, Ruler, ShieldCheck, Sparkles } from 'lucide-react';

const rows = [
  ['主色调倾向', '高明度青绿、浅蓝、浅草绿；部分娱乐页面使用深蓝黑', '宠主端保留低饱和薄荷绿；医生端使用医疗蓝；深蓝黑娱乐风格不进入医疗主流程'],
  ['辅助色用法', '黄色、橙色用于活力和促销，粉色用于情感标签，红色用于强调', '黄色仅作温暖提示；红色只用于真实风险和失败；不使用促销型彩虹色'],
  ['字体与字号', '标题粗黑、正文常规，功能卡标题大，辅助说明灰色', '一级标题22–24px、卡片标题15–17px、正文14–16px、辅助信息不低于11pt设计基线'],
  ['行高', '说明文字行距较宽，表单行保持单行与大触控面积', '正文1.55–1.7；表单行最小56px；医疗说明避免拥挤'],
  ['间距体系', '页面左右留白明显，模块间距大于模块内间距', '采用4/8/12/16/24/32间距体系；移动端左右16px；核心区块间24px'],
  ['圆角规范', '弹窗、输入框、功能卡普遍使用大圆角，按钮胶囊化', '主卡16px、弹层24px、输入框12px；胶囊只用于标签和主按钮，避免全页面过度卡通'],
  ['卡片形态', '白卡叠在浅色背景上，边框弱、阴影柔；内容卡通常一图一标题', '白卡+细边框+轻阴影；一张卡只承载一个任务或一个状态，不做功能大拼盘'],
  ['按钮样式', '主按钮高饱和青绿并接近通栏，次按钮灰白', '每屏一个主按钮；危险动作红色；次操作用描边或文字按钮；触控区域不小于44px'],
  ['布局范式', '顶部大视觉区、下方功能宫格；表单采用纵向单列；AI页采用对话+问题推荐', '首页改为宠物身份+今日护理+单一记录入口；表单保留单列；AI页降低角色插画占比'],
  ['信息密度', '社区和工具页差异很大；宫格页高密度，建档与空状态页低密度', '中等偏疏，每屏最多3个核心任务点；低频功能进入二级目录'],
];

const reusable = ['暖色或浅色背景承接焦虑用户', '大圆角与柔和阴影降低医疗距离感', '纵向单列表单降低首次建档难度', '空状态直接给出下一步主操作', 'AI入口使用明确提问框和推荐问题', '底部导航保持5个稳定入口'];
const rejected = ['社区瀑布流与创作玩法', '会员成长值、能量和促销商城', '大量3D吉祥物占据医疗信息区', '用高饱和渐变包装“智能诊断”', '无证据的24小时诊断承诺', '一屏十几个同权重工具入口'];

export function VisualStyleAnalysis() {
  return <main className="min-h-screen bg-[#f6f1e8] text-[#293e35]">
    <header className="border-b border-[#e3ddd1] bg-[#fffaf3]"><div className="mx-auto flex min-h-16 max-w-[1120px] items-center justify-between px-5"><a href="portal.html" className="flex min-h-11 items-center gap-2 text-sm font-black text-[#236a50]"><ArrowLeft size={17}/>返回系统总入口</a><span className="rounded-full bg-[#e4f3eb] px-3 py-2 text-[10px] font-bold text-[#277155]">14张截图客观拆解</span></div></header>
    <div className="mx-auto max-w-[1120px] px-5 py-10 sm:py-14">
      <section className="rounded-[30px] border border-[#d7e4dc] bg-[linear-gradient(135deg,#e8f5ed,#fff7e8)] p-6 sm:p-9"><div className="flex items-center gap-3 text-[#1f8061]"><Palette/><b className="text-xs tracking-[.16em]">VISUAL ANALYSIS</b></div><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">温暖可靠 · 专业不冰冷 · 宠物医疗感</h1><p className="mt-5 max-w-3xl text-sm leading-7 text-[#61746a]">只提取截图中的视觉基调、布局逻辑、留白策略、信息密度和组件组织方式；不复制品牌、吉祥物、文案或具体功能。</p></section>
      <section className="mt-8 overflow-hidden rounded-[26px] border border-[#e0e5e2] bg-white"><div className="hidden grid-cols-[.65fr_1.2fr_1.4fr] gap-3 bg-[#edf5f1] px-4 py-3 text-xs font-black sm:grid"><span>分析项</span><span>截图特征</span><span>宠馨智适配结论</span></div>{rows.map(([name, observed, fit]) => <div key={name} className="grid grid-cols-1 gap-3 border-t border-[#edf0ee] px-4 py-5 text-xs leading-6 first:border-t-0 sm:grid-cols-[.65fr_1.2fr_1.4fr] sm:gap-3 sm:py-4"><b className="text-sm sm:text-xs">{name}</b><span className="text-[#66776f]"><small className="mb-1 block text-[10px] font-black tracking-[.12em] text-[#829088] sm:hidden">截图特征</small>{observed}</span><span className="text-[#315e4c]"><small className="mb-1 block text-[10px] font-black tracking-[.12em] text-[#2f765a] sm:hidden">宠馨智适配结论</small>{fit}</span></div>)}</section>
      <div className="mt-8 grid gap-5 md:grid-cols-2"><AnalysisCard icon={CheckCircle2} title="可以复用" tone="green" items={reusable}/><AnalysisCard icon={CircleAlert} title="不适合直接带入" tone="amber" items={rejected}/></div>
      <section className="mt-8 grid gap-5 md:grid-cols-3"><SmallCard icon={Ruler} title="页面结构" detail="顶部定位、核心任务、最多3个高频入口、单一主按钮、辅助状态反馈。"/><SmallCard icon={Sparkles} title="宠物情绪" detail="宠物照片和轻插画用于陪伴感，不能遮挡风险、医嘱和执行状态。"/><SmallCard icon={ShieldCheck} title="医疗边界" detail="AI界面固定标注不诊断、不改药；医生签署来源始终可见。"/></section>
      <section className="mt-8 rounded-[26px] bg-[#203f33] p-6 text-white sm:p-8"><h2 className="text-xl font-black">最终适配判断</h2><p className="mt-4 text-sm leading-7 text-white/75">截图的“浅色底、大圆角、低压迫表单、明显主按钮、宠物陪伴感”适合宠主端；高饱和娱乐页、会员促销、社区瀑布流和过大的3D角色不适合宠馨智医疗主流程。医生端应沿用同一圆角与留白语言，但减少插画、提高列表与状态密度。</p><a href="experience.html" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-black text-[#245d49]">进入可点击护理闭环</a></section>
    </div>
  </main>;
}

function AnalysisCard({ icon: Icon, title, tone, items }: { icon: typeof CheckCircle2; title: string; tone: 'green' | 'amber'; items: string[] }) { const classes = tone === 'green' ? 'border-[#cfe2d8] bg-[#f2faf6] text-[#286f55]' : 'border-[#ead8ba] bg-[#fff8eb] text-[#8b642d]'; return <section className={`rounded-[24px] border p-5 ${classes}`}><div className="flex items-center gap-2 font-black"><Icon size={19}/>{title}</div><ul className="mt-4 space-y-3">{items.map(item => <li key={item} className="text-xs leading-5">• {item}</li>)}</ul></section>; }
function SmallCard({ icon: Icon, title, detail }: { icon: typeof Ruler; title: string; detail: string }) { return <article className="rounded-[24px] border border-[#e2e5e2] bg-white p-5"><Icon className="text-[#287257]"/><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-xs leading-6 text-[#697a72]">{detail}</p></article>; }
