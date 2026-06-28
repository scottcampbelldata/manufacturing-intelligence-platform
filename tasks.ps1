<#
Windows task runner mirroring the Makefile targets.
Usage:  .\tasks.ps1 <target>
        .\tasks.ps1 pipeline
Set $env:DATABASE_URL to override the database target.
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'db-up', 'db-down', 'generate', 'load', 'views', 'pipeline', 'demo', 'test', 'test-unit', 'lint', 'typecheck')]
    [string]$Target = 'help'
)

$ErrorActionPreference = 'Stop'
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/manufacturing'
}
$py = if ($env:PY) { $env:PY } else { 'python' }

function Generate { Push-Location generator; & $py generate_factory_data.py; Pop-Location }
function Load { psql "$env:DATABASE_URL" -f db/schema.sql; & $py db/load_data.py }
function Views { psql "$env:DATABASE_URL" -f db/analytical_views.sql }

switch ($Target) {
    'help' {
        Write-Output "Targets: db-up db-down generate load views pipeline demo test test-unit lint typecheck"
    }
    'db-up' { docker compose up -d --wait }
    'db-down' { docker compose down }
    'generate' { Generate }
    'load' { Load }
    'views' { Views }
    'pipeline' { Generate; Load; Views }
    'demo' { docker compose up -d --wait; Generate; Load; Views; Write-Output "Pipeline loaded. Start the API: cd backend; uvicorn app.main:app --port 8000" }
    'test' { pytest -q }
    'test-unit' { pytest -q -m "not db" }
    'lint' { ruff check . }
    'typecheck' { Push-Location frontend; npm run typecheck; Pop-Location }
}
