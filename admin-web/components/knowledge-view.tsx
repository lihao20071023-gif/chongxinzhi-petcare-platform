'use client';

import { useMemo, useState } from 'react';
import { BookPlus, ExternalLink, Pencil, Search, Trash2 } from 'lucide-react';
import type { KnowledgeEntry } from '@/lib/types';
import { Button, Drawer, EmptyState, Field, LoadingState, SectionHeader, Status, TableShell } from './ui';

type EditorValue = Partial<KnowledgeEntry> & { triggerTerms?: string };
const emptyEntry: EditorValue = { species: 'both', review_status: 'draft', triggerTerms: '' };

export function KnowledgeView({ items, loading, error, onSave, onDelete }: { items: KnowledgeEntry[]; loading: boolean; error: string; onSave: (value: EditorValue, id?: string) => Promise<void>; onDelete: (item: KnowledgeEntry) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [editor, setEditor] = useState<{ id?: string; value: EditorValue } | null>(null);
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => items.filter((item) => (!status || item.review_status === status) && (!query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))), [items, query, status]);

  function open(item?: KnowledgeEntry) {
    setEditor(item ? { id: item.id, value: { ...item, triggerTerms: item.trigger_terms.join('、') } } : { value: { ...emptyEntry } });
  }
  async function save() {
    if (!editor) return;
    setBusy(true);
    try { await onSave(editor.value, editor.id); setEditor(null); } finally { setBusy(false); }
  }

  return <>
    <SectionHeader title="知识库管理" description="只有“已审核”条目才会进入宠主AI问答检索。" action={<Button onClick={() => open()}><BookPlus size={17} />新增知识条目</Button>} />
    <div className="toolbar"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、疾病或来源" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="draft">草稿</option><option value="in_review">待复核</option><option value="approved">已审核</option><option value="retired">已停用</option></select></div>
    {loading ? <LoadingState /> : error ? <EmptyState title="知识库读取失败" description={error} /> : !filtered.length ? <EmptyState title="没有符合条件的知识条目" description="可新增第一条结构化知识，或调整搜索条件。" /> : <TableShell><table><thead><tr><th>知识条目</th><th>对象</th><th>疾病/阶段</th><th>来源</th><th>版本</th><th>状态</th><th>操作</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.slug}</small></td><td>{item.species === 'cat' ? '猫' : item.species === 'dog' ? '犬' : '猫犬'}</td><td>{item.disease}<small>{item.stage || '未限定阶段'}</small></td><td>{item.source_organization || '未填写机构'}<small>{item.source_title}{item.source_year ? ` · ${item.source_year}` : ''}</small></td><td>v{item.version}</td><td><Status value={item.review_status} /></td><td><div className="row-actions"><button onClick={() => open(item)}><Pencil size={15} />编辑</button>{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer"><ExternalLink size={15} />来源</a> : null}<button className="danger-link" onClick={() => onDelete(item)}><Trash2 size={15} />删除</button></div></td></tr>)}</tbody></table></TableShell>}
    {editor ? <Drawer title={editor.id ? '编辑知识条目' : '新增知识条目'} description="请保存结构化摘要、适用条件、禁止推断和完整出处。" onClose={() => setEditor(null)} footer={<><Button variant="secondary" onClick={() => setEditor(null)}>取消</Button><Button onClick={save} disabled={busy}>{busy ? '保存中…' : '保存条目'}</Button></>}>
      <div className="form-grid">
        <Field label="知识编号" required><input value={editor.value.slug || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, slug: e.target.value } })} placeholder="CKD-CAT-001" /></Field>
        <Field label="标题" required><input value={editor.value.title || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, title: e.target.value } })} /></Field>
        <Field label="适用对象"><select value={editor.value.species || 'both'} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, species: e.target.value as KnowledgeEntry['species'] } })}><option value="both">猫犬</option><option value="cat">猫</option><option value="dog">犬</option></select></Field>
        <Field label="审核状态"><select value={editor.value.review_status || 'draft'} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, review_status: e.target.value as KnowledgeEntry['review_status'] } })}><option value="draft">草稿</option><option value="in_review">待复核</option><option value="approved">已审核</option><option value="retired">已停用</option></select></Field>
        <Field label="疾病" required><input value={editor.value.disease || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, disease: e.target.value } })} /></Field>
        <Field label="阶段"><input value={editor.value.stage || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, stage: e.target.value } })} /></Field>
        <Field label="使用场景" required><input value={editor.value.scenario || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, scenario: e.target.value } })} /></Field>
        <Field label="触发词" hint="使用顿号或逗号分隔"><input value={editor.value.triggerTerms || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, triggerTerms: e.target.value } })} /></Field>
        <Field label="核心结论" required><textarea value={editor.value.core_conclusion || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, core_conclusion: e.target.value } })} /></Field>
        <Field label="适用条件" required><textarea value={editor.value.applicability || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, applicability: e.target.value } })} /></Field>
        <Field label="宠主解释" required><textarea value={editor.value.owner_explanation || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, owner_explanation: e.target.value } })} /></Field>
        <Field label="下一步行动" required><textarea value={editor.value.next_action || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, next_action: e.target.value } })} /></Field>
        <Field label="禁止推断" required><textarea value={editor.value.forbidden_inference || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, forbidden_inference: e.target.value } })} /></Field>
        <Field label="来源标题" required><input value={editor.value.source_title || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, source_title: e.target.value } })} /></Field>
        <Field label="发布机构"><input value={editor.value.source_organization || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, source_organization: e.target.value } })} /></Field>
        <Field label="年份"><input type="number" value={editor.value.source_year || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, source_year: e.target.value ? Number(e.target.value) : null } })} /></Field>
        <Field label="原文链接"><input type="url" value={editor.value.source_url || ''} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, source_url: e.target.value } })} /></Field>
      </div>
    </Drawer> : null}
  </>;
}
