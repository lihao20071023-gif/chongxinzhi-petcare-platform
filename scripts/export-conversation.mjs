import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [threadId, outputDir] = process.argv.slice(2);

if (!threadId || !outputDir) {
  console.error('用法: node scripts/export-conversation.mjs <thread-id> <output-dir>');
  process.exit(1);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(fullPath);
  }
  return files;
}

function messageText(payload) {
  if (!Array.isArray(payload?.content)) return '';
  return payload.content
    .filter((item) => ['input_text', 'output_text', 'text'].includes(item?.type))
    .map((item) => item.text || '')
    .join('\n')
    .trim();
}

function cleanUserText(value) {
  return value
    .replace(/<in-app-browser-context[\s\S]*?<\/in-app-browser-context>\s*/g, '')
    .replace(/<environment_context[\s\S]*?<\/environment_context>\s*/g, '')
    .replace(/<permissions instructions>[\s\S]*?<\/permissions instructions>\s*/g, '')
    .replace(/<skills_instructions>[\s\S]*?<\/skills_instructions>\s*/g, '')
    .replace(/<recommended_plugins>[\s\S]*?<\/recommended_plugins>\s*/g, '')
    .replace(/^## My request(?: for Codex)?:\s*/m, '')
    .trim();
}

const sessionRoot = path.join(process.env.HOME, '.codex', 'sessions');
const candidates = await walk(sessionRoot);
const metadata = [];

for (const file of candidates) {
  const firstLine = (await readFile(file, 'utf8')).split('\n', 1)[0];
  try {
    const first = JSON.parse(firstLine);
    if (first?.type === 'session_meta') metadata.push({ file, ...first.payload });
  } catch {
    // 忽略损坏或不属于会话的日志。
  }
}

// 当前任务可能是从更早的任务分叉而来。沿 forked_from_id 向前追溯，
// 同时排除共享 session_id 的子代理日志，确保导出的是用户主对话。
const conversationIds = [];
let currentId = threadId;
while (currentId && !conversationIds.includes(currentId)) {
  conversationIds.push(currentId);
  const currentMeta = metadata.find((item) => item.id === currentId && !item.agent_nickname);
  currentId = currentMeta?.forked_from_id || null;
}

const sourceFiles = metadata
  .filter((item) => conversationIds.includes(item.id) && !item.agent_nickname)
  .map((item) => item.file);

const messages = [];
const seen = new Set();

for (const file of sourceFiles) {
  const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
  for (const line of lines) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const payload = event?.payload;
    if (event?.type !== 'response_item' || payload?.type !== 'message') continue;
    if (!['user', 'assistant'].includes(payload.role)) continue;
    let text = messageText(payload);
    if (payload.role === 'user') text = cleanUserText(text);
    if (!text) continue;
    const key = payload.id || `${event.timestamp}:${payload.role}:${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    messages.push({
      role: payload.role,
      text,
      timestamp: event.timestamp || '',
      ordinal: Number(event.ordinal || 0),
      phase: payload.phase || '',
    });
  }
}

messages.sort((a, b) => a.ordinal - b.ordinal || a.timestamp.localeCompare(b.timestamp));

const exportedAt = new Date().toISOString();
const fullHeader = `# 宠馨智项目完整对话记录\n\n- 当前会话编号：${threadId}\n- 追溯的主对话编号：${conversationIds.join(' → ')}\n- 导出时间：${exportedAt}\n- 原始会话分段：${sourceFiles.length} 个\n- 收录范围：用户真实需求、附件引用、助手回复与进度说明\n- 已排除：系统内部指令、子代理内部对话、权限配置、工具调用日志和隐藏运行信息\n\n`;
const promptHeader = `# 宠馨智用户需求与提示词汇总\n\n- 会话编号：${threadId}\n- 导出时间：${exportedAt}\n- 用途：迁移到新电脑、交给开发团队或继续让其他AI理解项目\n\n`;

const fullBody = messages.map((item, index) => {
  const label = item.role === 'user' ? '用户' : '助手';
  const phase = item.role === 'assistant' && item.phase ? ` · ${item.phase}` : '';
  return `## ${String(index + 1).padStart(3, '0')} · ${label}${phase}\n\n${item.text}\n`;
}).join('\n');

const prompts = messages.filter((item) => item.role === 'user');
const promptBody = prompts.map((item, index) => `## 提示词 ${String(index + 1).padStart(3, '0')}\n\n${item.text}\n`).join('\n');

await writeFile(path.join(outputDir, '完整对话记录.md'), fullHeader + fullBody, 'utf8');
await writeFile(path.join(outputDir, '用户需求与提示词汇总.md'), promptHeader + promptBody, 'utf8');

console.log(JSON.stringify({ conversationIds, sourceFiles, messages: messages.length, prompts: prompts.length }, null, 2));
