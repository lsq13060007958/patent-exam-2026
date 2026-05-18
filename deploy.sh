#!/bin/bash
# 部署脚本 - 专利代理师考试 App
# 使用方法: bash deploy.sh

set -e
cd "$(dirname "$0")"

echo "=== 专利代理师考试 App 部署 ==="
echo ""

# 检查 git
if ! command -v git &> /dev/null; then
    echo "❌ git 未安装"
    exit 1
fi

# 添加文件
echo "📦 添加文件..."
git add index.html styles.css app.js utils.js data_patent_2026.js data_xg_2026.js data_lecture_pt.js data_lecture_xg.js README.md .gitignore

# 提交
echo "📝 提交更改..."
git commit -m "更新: $(date +%Y-%m-%d)" --allow-empty

# 推送
echo "🚀 推送到 GitHub..."
git push origin master

echo ""
echo "✅ 部署完成!"
echo "📱 访问: https://lsq13060007958.github.io/patent-exam-2026/"
echo ""
echo "如果推送失败，请先设置 GitHub 认证:"
echo "  git config credential.helper store"
echo "  然后输入你的 GitHub 用户名和 Personal Access Token"
