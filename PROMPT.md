# MyClaw Ralph Loop 提示词

## 任务目标
完成智能助手 MyClaw 的开发工作。

## 工作流程（每次迭代都要做）

1. **同步代码**
   ```
   git fetch origin master && git checkout master && git pull origin master
   ```

2. **学习设计文档**
   - 阅读 `docs/MYCLAW_DESIGN.md`
   - 阅读 `docs/ARCHITECTURE.md`
   - 阅读 `docs/STORIES.json`
   - 阅读 `docs/PROGRESS.json`

3. **对比设计与实现**
   - 识别当前实现与设计的差异
   - 找出缺失的模块

4. **选择任务**
   - 从 `PROGRESS.json` 选择高优先级、有依赖关系的基础特性
   - 优先完成 Phase 1 > Phase 2 > Phase 3

5. **实现任务**
   - 编写代码
   - 运行 `npm run lint`
   - 运行 `npm run format`
   - 运行 `npm test`
   - 运行 python lint
   - 运行 python 格式化
   - 运行 python 测试

6. **提交代码**
   ```
   git add -A
   git commit -m "描述本次修改"
   git push origin master
   ```

7. **更新进度**
   - 更新 `docs/PROGRESS.json` 将完成的任务状态改为 "done"

## 安全要求
⚠️ **不要提交敏感信息到 GitHub**
- `.env` 文件不要提交
- API Keys、Tokens 不要提交

## 完成条件
当 `PROGRESS.json` 中所有任务状态都为 "done" 时，输出：
```
<promise>DONE</promise>
```
