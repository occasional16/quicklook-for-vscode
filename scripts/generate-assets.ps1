Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root "assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null

function New-Canvas($width, $height) {
    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    return @($bitmap, $graphics)
}

function Save-Canvas($bitmap, $graphics, $path) {
    $graphics.Dispose()
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}

function Draw-RoundedRectangle($graphics, $brush, $x, $y, $width, $height, $radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $graphics.FillPath($brush, $path)
    $path.Dispose()
}

function Draw-Text($graphics, $text, $fontName, $size, $style, $brush, $x, $y, $width, $height) {
    $font = [System.Drawing.Font]::new($fontName, [single]$size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Near
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rectangle = [System.Drawing.RectangleF]::new([single]$x, [single]$y, [single]$width, [single]$height)
    $graphics.DrawString($text, $font, $brush, $rectangle, $format)
    $format.Dispose()
    $font.Dispose()
}

$dark = [System.Drawing.Color]::FromArgb(255, 24, 24, 27)
$panel = [System.Drawing.Color]::FromArgb(255, 37, 37, 42)
$panelAlt = [System.Drawing.Color]::FromArgb(255, 45, 45, 48)
$line = [System.Drawing.Color]::FromArgb(255, 75, 85, 99)
$accent = [System.Drawing.Color]::FromArgb(255, 0, 122, 204)
$accent2 = [System.Drawing.Color]::FromArgb(255, 45, 212, 191)
$text = [System.Drawing.Color]::FromArgb(255, 245, 245, 245)
$muted = [System.Drawing.Color]::FromArgb(255, 185, 190, 199)

$icon = New-Canvas 256 256
$bitmap = $icon[0]
$graphics = $icon[1]
$graphics.Clear($dark)
Draw-RoundedRectangle $graphics (New-Object System.Drawing.SolidBrush $panel) 18 18 220 220 36
$eyePen = New-Object System.Drawing.Pen $accent2, 12
$graphics.DrawEllipse($eyePen, 56, 82, 144, 88)
$graphics.FillEllipse((New-Object System.Drawing.SolidBrush $accent), 105, 105, 46, 46)
Draw-Text $graphics "QL" "Segoe UI" 44 ([System.Drawing.FontStyle]::Bold) (New-Object System.Drawing.SolidBrush $text) 78 162 112 48
Save-Canvas $bitmap $graphics (Join-Path $assets "icon.png")

$shot = New-Canvas 1280 720
$bitmap = $shot[0]
$graphics = $shot[1]
$graphics.Clear($dark)
$brushPanel = New-Object System.Drawing.SolidBrush $panel
$brushPanelAlt = New-Object System.Drawing.SolidBrush $panelAlt
$brushAccent = New-Object System.Drawing.SolidBrush $accent
$brushText = New-Object System.Drawing.SolidBrush $text
$brushMuted = New-Object System.Drawing.SolidBrush $muted
$penLine = New-Object System.Drawing.Pen $line, 1
$graphics.FillRectangle($brushPanel, 0, 0, 1280, 44)
$graphics.FillRectangle($brushPanelAlt, 0, 44, 280, 676)
Draw-Text $graphics "EXPLORER" "Segoe UI" 16 ([System.Drawing.FontStyle]::Bold) $brushMuted 24 62 220 28
Draw-Text $graphics "quicklook-for-vscode" "Segoe UI" 17 ([System.Drawing.FontStyle]::Bold) $brushText 24 104 240 28
$files = @("README.md", "CHANGELOG.md", "sample-image.png", "demo.pdf", "archive.zip")
$y = 150
foreach ($file in $files) {
    if ($file -eq "sample-image.png") { $graphics.FillRectangle($brushAccent, 18, $y - 4, 244, 34) }
    Draw-Text $graphics $file "Segoe UI" 18 ([System.Drawing.FontStyle]::Regular) $brushText 34 $y 220 24
    $y += 40
}
Draw-RoundedRectangle $graphics (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 32, 32, 36))) 360 145 760 430 12
Draw-Text $graphics "QuickLook: Preview File" "Segoe UI" 34 ([System.Drawing.FontStyle]::Bold) $brushText 410 190 560 54
Draw-Text $graphics "Select a file in Explorer and press Backtick to preview it with Windows QuickLook." "Segoe UI" 22 ([System.Drawing.FontStyle]::Regular) $brushMuted 410 260 650 46
Draw-RoundedRectangle $graphics $brushAccent 410 345 210 56 10
Draw-Text $graphics "Preview" "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold) $brushText 460 354 130 38
Draw-Text $graphics "Output channel logs path detection and launch results for troubleshooting." "Segoe UI" 19 ([System.Drawing.FontStyle]::Regular) $brushMuted 410 440 660 42
Save-Canvas $bitmap $graphics (Join-Path $assets "screenshot-preview.png")

$shot = New-Canvas 1280 720
$bitmap = $shot[0]
$graphics = $shot[1]
$graphics.Clear($dark)
Draw-RoundedRectangle $graphics $brushPanel 260 82 760 560 14
Draw-Text $graphics "Set QuickLook Executable Path" "Segoe UI" 32 ([System.Drawing.FontStyle]::Bold) $brushText 310 118 620 56
Draw-Text $graphics "Use a detected path, browse for QuickLook.exe, or enter a path manually." "Segoe UI" 19 ([System.Drawing.FontStyle]::Regular) $brushMuted 312 178 660 38
$options = @(
    "Use detected QuickLook.exe  D:\...\QuickLook.exe",
    "Browse for QuickLook.exe",
    "Enter path manually",
    "Open Settings"
)
$y = 244
foreach ($option in $options) {
    $fill = $brushPanelAlt
    if ($y -eq 258) { $fill = $brushAccent }
    Draw-RoundedRectangle $graphics $fill 312 $y 656 56 8
    Draw-Text $graphics $option "Segoe UI" 20 ([System.Drawing.FontStyle]::Regular) $brushText 334 ($y + 6) 600 42
    $y += 74
}
Draw-Text $graphics "Check installation shows the configured path, detected path, and output log." "Segoe UI" 18 ([System.Drawing.FontStyle]::Regular) $brushMuted 312 534 650 64
Save-Canvas $bitmap $graphics (Join-Path $assets "screenshot-path-setup.png")

Write-Host "Generated assets in $assets"