#!/usr/bin/env bash

# 定义输出文件名
OUTPUT="merged_output.txt"
# 获取脚本自身的文件名，以便在合并时排除自己
SCRIPT_NAME=$(basename "$0")

# 开始前，先清空或创建输出文件
: > "$OUTPUT"

echo "开始合并重要的开发文件..."

# 使用 find 命令查找文件
# -path ... -prune -o 用于完整地排除指定目录
# -type f 表示只查找文件
# ! -name "..." 用于根据文件名或模式排除文件
find . \
  -path "./node_modules" -prune -o \
  -path "./dist" -prune -o \
  -path "./src-tauri/target" -prune -o \
  -path "./.git" -prune -o \
  -type f \
  ! -name ".DS_Store" \
  ! -name "$OUTPUT" \
  ! -name "$SCRIPT_NAME" \
  ! -name "treestructure.txt" \
  ! -name "*.png" \
  ! -name "*.svg" \
  ! -name "*.ico" \
  ! -name "*.icns" \
  ! -name "*.dmg" \
  ! -name "*.node" \
  ! -name "*.map" \
  -print |
  sort |
  while IFS= read -r filepath; do
    # 打印文件路径作为分隔符
    echo "===== ${filepath} =====" >> "$OUTPUT"
    # 将文件内容追加到输出文件
    cat "$filepath" >> "$OUTPUT"
    # 在每个文件后添加一个空行，以便于阅读
    echo "" >> "$OUTPUT"
  done

echo "合并完成！所有重要文件已合并到: $OUTPUT"
