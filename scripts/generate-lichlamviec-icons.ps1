Add-Type -AssemblyName System.Drawing
$assetDirectory = Join-Path $PSScriptRoot "..\public\lichlamviec-assets"

function New-LichLamViecIcon {
  param([int] $Size, [string] $FileName, [bool] $Maskable = $false)
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(24, 132, 239))
  $margin = if ($Maskable) { [int]($Size * .22) } else { [int]($Size * .13) }
  $card = [System.Drawing.Rectangle]::new($margin, $margin, $Size - 2 * $margin, $Size - 2 * $margin)
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $graphics.FillRectangle($white, $card)
  $header = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(220, 238, 255))
  $graphics.FillRectangle($header, $card.X, $card.Y, $card.Width, [int]($card.Height * .25))
  $sun = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 181, 27))
  $sunSize = [int]($card.Width * .24)
  $graphics.FillEllipse($sun, $card.X + [int]($card.Width * .14), $card.Y + [int]($card.Height * .52), $sunSize, $sunSize)
  $moon = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(76, 101, 217))
  $moonSize = [int]($card.Width * .3)
  $moonX = $card.X + [int]($card.Width * .57)
  $moonY = $card.Y + [int]($card.Height * .47)
  $graphics.FillEllipse($moon, $moonX, $moonY, $moonSize, $moonSize)
  $cutout = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $graphics.FillEllipse($cutout, $moonX + [int]($moonSize * .25), $moonY - [int]($moonSize * .08), $moonSize, $moonSize)
  $bitmap.Save((Join-Path $assetDirectory $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $cutout.Dispose(); $moon.Dispose(); $sun.Dispose(); $header.Dispose(); $white.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

New-LichLamViecIcon -Size 192 -FileName "icon-192.png"
New-LichLamViecIcon -Size 512 -FileName "icon-512.png"
New-LichLamViecIcon -Size 512 -FileName "icon-maskable-512.png" -Maskable $true
New-LichLamViecIcon -Size 180 -FileName "apple-touch-icon.png"
