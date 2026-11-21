<#
.SYNOPSIS
  Headless audit: no file under src/lib may import React. The script decides pass/fail from
  the validated `structured_output` object, never from Claude's free text (`result`).

.NOTES
  Exit codes (stable contract, meant for schedulers / background agents):
    0  clean and completed
    1  violations found (prints file:line - message for each)
    2  run did not complete (turn/budget cap, timeout, hook block, no structured_output, bad output)
    3  script-level failure (claude not found, unparsable envelope, lock held, tree changed)
  The last stdout line is always a one-line JSON summary.
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot,
  [int]$MaxTurns = 15,
  [double]$MaxBudgetUsd = 1,
  [int]$TimeoutSec = 300,
  [string]$Model = 'claude-sonnet-5-5',
  [string]$ReportPath,
  [string]$EnvelopePath,
  [switch]$VerifyTreeUnchanged
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $ScriptDir }
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$script:Summary = [ordered]@{
  status = 'script_error'; exitCode = 3; subtype = $null; isError = $null
  numTurns = $null; costUsd = $null; filesScanned = $null; findings = @(); detail = $null
}

function Finish([int]$Code, [string]$Status, [string]$Detail) {
  $script:Summary.exitCode = $Code
  $script:Summary.status = $Status
  $script:Summary.detail = $Detail
  $json = $script:Summary | ConvertTo-Json -Compress -Depth 6
  if ($ReportPath) {
    try { [IO.File]::WriteAllText($ReportPath, $json, [Text.UTF8Encoding]::new($false)) } catch { Write-Output "Warning: failed to write report ($($_.Exception.Message))" }
  }
  Write-Output $json
  exit $Code
}

try {
  # --- paths (dynamic, never relative to the caller's cwd) ---
  $root = (Resolve-Path -LiteralPath $ProjectRoot -ErrorAction Stop).ProviderPath
  $promptFile = Join-Path $ScriptDir 'audit-rule.prompt.txt'
  $schemaFile = Join-Path $ScriptDir 'audit-rule.schema.json'
  $libDir = Join-Path $root 'src\lib'
  foreach ($p in @($promptFile, $schemaFile, $libDir)) {
    if (-not (Test-Path -LiteralPath $p)) { Finish 3 'script_error' "Missing file or directory: $p" }
  }
  $claude = Get-Command claude -ErrorAction SilentlyContinue
  if (-not $claude) { Finish 3 'script_error' 'The claude command was not found in PATH' }

  # --- lock: one audit per project at a time (released by the OS even after a crash) ---
  $hash = [BitConverter]::ToString([Security.Cryptography.SHA1]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant()))).Replace('-', '').Substring(0, 12)
  $lockPath = Join-Path ([IO.Path]::GetTempPath()) "audit-rule-$hash.lock"
  try {
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
  } catch {
    Finish 3 'script_error' "Another audit is already running on this project (lock: $lockPath)"
  }

  # --- independent ground truth: how many files the audit must scan ---
  $expectedFiles = @(Get-ChildItem -LiteralPath $libDir -Recurse -File | Where-Object { $_.Extension -in '.ts', '.tsx' }).Count

  $statusBefore = $null
  if ($VerifyTreeUnchanged) { $statusBefore = (git -C $root status --porcelain) -join "`n" }

  # --- run claude headless: read-only tools, no MCP, capped turns/budget, schema-validated output ---
  $schema = (Get-Content -LiteralPath $schemaFile -Raw -Encoding utf8 | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 10)
  $schemaArg = '"' + ($schema -replace '"', '\"') + '"'
  $argList = @(
    '-p', '--model', $Model, '--tools', '"Read,Grep,Glob"', '--disallowedTools', '"mcp__*"',
    '--max-turns', $MaxTurns, '--max-budget-usd', $MaxBudgetUsd.ToString([Globalization.CultureInfo]::InvariantCulture),
    '--output-format', 'json', '--json-schema', $schemaArg, '--no-session-persistence'
  ) -join ' '

  $psi = [Diagnostics.ProcessStartInfo]::new($claude.Source, $argList)
  $psi.WorkingDirectory = $root
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.StandardOutputEncoding = [Text.Encoding]::UTF8
  $psi.StandardErrorEncoding = [Text.Encoding]::UTF8
  $proc = [Diagnostics.Process]::Start($psi)
  $outTask = $proc.StandardOutput.ReadToEndAsync()
  $errTask = $proc.StandardError.ReadToEndAsync()
  # prompt goes through stdin (no quoting problems); closing stdin guarantees claude never waits for input
  $writer = [IO.StreamWriter]::new($proc.StandardInput.BaseStream, [Text.UTF8Encoding]::new($false))
  $writer.Write((Get-Content -LiteralPath $promptFile -Raw -Encoding utf8))
  $writer.Close()

  if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
    & taskkill /T /F /PID $proc.Id | Out-Null
    Finish 2 'timeout' "Run was killed after $TimeoutSec seconds and did not complete"
  }
  $proc.WaitForExit()
  $rawOut = $outTask.GetAwaiter().GetResult()
  $rawErr = $errTask.GetAwaiter().GetResult()
  if ($EnvelopePath) { [IO.File]::WriteAllText($EnvelopePath, $rawOut, [Text.UTF8Encoding]::new($false)) }

  if ($VerifyTreeUnchanged) {
    $statusAfter = (git -C $root status --porcelain) -join "`n"
    if ($statusAfter -ne $statusBefore) { Finish 3 'tree_changed' 'Working tree changed during the audit (git status differs)' }
  }

  # --- parse the FULL envelope (no filtering) ---
  try { $env = $rawOut | ConvertFrom-Json } catch { $env = $null }
  if (-not $env -or $env.type -ne 'result') {
    Finish 3 'script_error' "Missing or invalid JSON envelope (claude exit code: $($proc.ExitCode)). stderr: $($rawErr.Trim())"
  }
  $script:Summary.subtype = $env.subtype
  $script:Summary.isError = $env.is_error
  $script:Summary.numTurns = $env.num_turns
  $script:Summary.costUsd = $env.total_cost_usd

  # --- completion gates: any failure means "not completed", never "clean" ---
  if ($env.is_error -or $env.subtype -ne 'success') {
    Finish 2 'incomplete' "Run did not complete: subtype=$($env.subtype), is_error=$($env.is_error), turns=$($env.num_turns), cost=$($env.total_cost_usd)"
  }
  if (-not ($env.PSObject.Properties.Name -contains 'structured_output') -or $null -eq $env.structured_output) {
    Finish 2 'incomplete' "No structured_output in the envelope (subtype=$($env.subtype)); the Stop hook may have blocked the run"
  }
  $so = $env.structured_output
  if ($so.completed -ne $true -or $so.filesScanned -lt 1) {
    Finish 2 'incomplete' "Agent reported completed=$($so.completed), filesScanned=$($so.filesScanned)"
  }
  if ([int]$so.filesScanned -ne $expectedFiles) {
    Finish 2 'incomplete' "filesScanned=$($so.filesScanned) does not match the actual file count in src/lib ($expectedFiles)"
  }
  $findings = @($so.findings)
  foreach ($f in $findings) {
    if (-not ($f.file -is [string]) -or -not ($f.line -is [int] -or $f.line -is [long]) -or $f.line -lt 1 -or -not ($f.message -is [string])) {
      Finish 2 'incomplete' 'Invalid finding in the structured output (file/line/message)'
    }
  }
  $script:Summary.filesScanned = [int]$so.filesScanned
  $script:Summary.findings = $findings

  # --- decision ---
  if ($findings.Count -gt 0) {
    foreach ($f in $findings) { Write-Output ('{0}:{1} - {2}' -f $f.file, $f.line, $f.message) }
    Finish 1 'violations' "Found $($findings.Count) violation(s)"
  }
  Finish 0 'clean' "Clean: 0 violations, $($so.filesScanned) files scanned"
} catch {
  Finish 3 'script_error' $_.Exception.Message
}
