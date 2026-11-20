[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
cd C:\FileExplorer\FileExplorer
$promptText = Get-Content .\exce_11\audit-prompt.txt -Raw -Encoding utf8
claude -p $promptText `
  --model claude-sonnet-5-5 `
  --effort medium `
  --tools "Read,Grep,Glob" `
  --max-turns 15 `
  --max-budget-usd 1 `
  --output-format json |
  jq '{is_error, num_turns, total_cost_usd, duration_ms, result}' |
  Set-Content -Path .\exce_11\sonnet55-medium.json -Encoding utf8