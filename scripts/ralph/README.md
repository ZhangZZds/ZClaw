# MyClaw Ralph Loop

## 使用方法

### PowerShell
```powershell
.\scripts\ralph\ralph-loop.ps1 100 bailian-coding-plan/glm-5
```

### Git Bash
```bash
bash scripts/ralph/ralph-loop.sh 100 bailian-coding-plan/glm-5
```

## 结构

```
while :; do
    cat PROMPT.md | opencode --model $MODEL
done
```

所有工作都交给大模型完成：
- 同步代码
- 读文档
- 写代码
- 运行测试
- 提交 Git
- 更新进度

完成时输出 `<promise>DONE</promise>`
