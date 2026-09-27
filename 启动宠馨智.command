#!/bin/zsh

set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PREVIEW_URL="http://127.0.0.1:3300/portal.html"

cd "$PROJECT_DIR" || exit 1

# 优先使用用户自己安装的 Node.js；Codex 环境则使用其内置运行时。
if command -v node >/dev/null 2>&1; then
  NODE_DIR="$(dirname "$(command -v node)")"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  NODE_DIR="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
else
  echo "未找到 Node.js。请先安装 Node.js 20 或更高版本。"
  echo "按回车键关闭窗口。"
  read -r
  exit 1
fi

export PATH="$NODE_DIR:$PATH"

if command -v pnpm >/dev/null 2>&1; then
  PNPM_COMMAND=(pnpm)
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm" ]]; then
  PNPM_COMMAND=("$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm")
elif command -v corepack >/dev/null 2>&1; then
  PNPM_COMMAND=(corepack pnpm)
else
  echo "未找到 pnpm。请先安装 pnpm。"
  echo "按回车键关闭窗口。"
  read -r
  exit 1
fi

# 服务已在运行时直接打开，不重复启动或结束其他进程。
if curl --silent --fail --max-time 2 "$PREVIEW_URL" >/dev/null 2>&1; then
  echo "宠馨智已在运行：$PREVIEW_URL"
  open "$PREVIEW_URL"
  exit 0
fi

echo "正在启动宠馨智本地预览……"
"${PNPM_COMMAND[@]}" preview:static &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1
  fi
}
trap cleanup INT TERM EXIT

for _ in {1..30}; do
  if curl --silent --fail --max-time 1 "$PREVIEW_URL" >/dev/null 2>&1; then
    echo "启动成功：$PREVIEW_URL"
    open "$PREVIEW_URL"
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 0.5
done

echo "启动失败，请查看上方错误日志。"
cleanup
echo "按回车键关闭窗口。"
read -r
exit 1
