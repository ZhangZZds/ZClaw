# Ralph Loop for MyClaw
# Windows PowerShell 版本
# 用法：.\ralph-loop.ps1 100 bailian-coding-plan/glm-5

param(
    [int]$MaxIterations = 100,
    [string]$Model = "bailian-coding-plan/glm-5"
)

Write-Host "Ralph Loop - MyClaw"
Write-Host "迭代次数：$MaxIterations, 模型：$Model"

$iteration = 0

while ($iteration -lt $MaxIterations) {
    $iteration++
    Write-Host "=== 第 $iteration 次迭代 ==="
    
    Get-Content "PROMPT.md" -Raw | opencode --model $Model
    
    Start-Sleep -Seconds 5
}

Write-Host "<promise>DONE</promise>"
