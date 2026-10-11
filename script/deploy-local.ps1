# Ejecutar en PowerShell 7 (pwsh), con Docker Desktop abierto en modo Linux.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @('compose', '--project-name', 'team-mex-mtto',
    '-f', (Join-Path $repoRoot 'docker-compose.yml'),
    '-f', (Join-Path $repoRoot 'compose.local.yml'), '--profile', 'app')

function Invoke-Docker {
    param([string[]]$DockerArgs)
    & docker @DockerArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Docker falló (exit $LASTEXITCODE). Revisa la salida anterior."
    }
}

Push-Location $repoRoot
try {
    $dockerOS = & docker info --format '{{.OSType}}'
    if ($LASTEXITCODE -ne 0 -or $dockerOS.Trim() -ne 'linux') {
        throw 'Docker Desktop debe estar abierto y usar Linux containers.'
    }
    # Compose >= 2.24.4 soporta !override, necesario para limitar los puertos.
    Invoke-Docker -DockerArgs ($composeArgs + @('config', '--quiet'))
    # Si falla el build, el stack anterior sigue corriendo.
    Invoke-Docker -DockerArgs ($composeArgs + @('build', 'api', 'web'))
    Invoke-Docker -DockerArgs ($composeArgs + @('up', '-d', '--no-build', '--wait', '--wait-timeout', '600'))
    Invoke-Docker -DockerArgs ($composeArgs + @('ps'))
    Write-Host 'App lista: http://localhost:3000 | API: http://localhost:3001/health'
} finally {
    Pop-Location
}
