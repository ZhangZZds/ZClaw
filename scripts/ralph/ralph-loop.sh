# Ralph Loop for MyClaw - Git Bash 版本
# 用法：bash ralph-loop.sh 100 bailian-coding-plan/glm-5

MAX_ITERATIONS=${1:-100}
MODEL=${2:-"bailian-coding-plan/glm-5"}

echo "Ralph Loop - MyClaw"
echo "迭代次数：$MAX_ITERATIONS, 模型：$MODEL"

iteration=0

while [ $iteration -lt $MAX_ITERATIONS ]; do
    iteration=$((iteration + 1))
    echo "=== 第 $iteration 次迭代 ==="
    cat scripts/ralph/PROMPT.md | opencode --model "$MODEL"
    sleep 5
done

echo "<promise>DONE</promise>"
