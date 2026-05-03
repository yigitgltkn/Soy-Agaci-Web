# rebuild.ps1 — Embeds data.js into index-template.html and writes index.html.
# Run via rebuild.bat (double-click) or `powershell -File rebuild.ps1`.

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

$tplPath  = Join-Path $here 'index-template.html'
$dataPath = Join-Path $here 'data.js'
$outPath  = Join-Path $here 'index.html'

if (-not (Test-Path $tplPath))  { Write-Host "HATA: index-template.html bulunamadi." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $dataPath)) { Write-Host "HATA: data.js bulunamadi." -ForegroundColor Red; exit 1 }

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$tpl  = [System.IO.File]::ReadAllText($tplPath,  $utf8NoBom)
$data = [System.IO.File]::ReadAllText($dataPath, $utf8NoBom)

$placeholder = '<script src="data.js"></script>'
if (-not $tpl.Contains($placeholder)) {
    Write-Host "HATA: index-template.html icinde '<script src=`"data.js`"></script>' satiri yok." -ForegroundColor Red
    exit 1
}

$replacement = "<script>`n$data`n</script>"
$out = $tpl.Replace($placeholder, $replacement)
[System.IO.File]::WriteAllText($outPath, $out, $utf8NoBom)

$sz = (Get-Item $outPath).Length
Write-Host ""
Write-Host ("[OK] index.html guncellendi ({0:N0} byte)" -f $sz) -ForegroundColor Green
Write-Host ""
Write-Host "Sonraki adim:" -ForegroundColor Cyan
Write-Host "  VS Code'da Source Control panelini ac (Ctrl+Shift+G)" -ForegroundColor Cyan
Write-Host "  Mesaj yaz, commit (cek), sonra Sync (yukari ok) bas." -ForegroundColor Cyan
Write-Host "  Netlify GitHub'dan otomatik cekecek - 30-60 sn sonra canlida." -ForegroundColor Cyan
Write-Host ""
