#!/usr/bin/env bash

OUTPUT="merged_output.txt"
# 先清空输出文件
: > "$OUTPUT"

find . \
  \( -path "./node_modules" -o -path "./node_modules/*" \) -prune \
  -o -type f ! -name "$OUTPUT" -print |
  sort |
  while IFS= read -r filepath; do
    echo "===== ${filepath} =====" >> "$OUTPUT"
    cat "$filepath" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
  done

