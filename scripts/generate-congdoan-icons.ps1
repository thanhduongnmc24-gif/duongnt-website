Add-Type -AssemblyName System.Drawing

$assetDirectory = Join-Path $PSScriptRoot "..\public\congdoan-assets"

function New-CongDoanIcon {
  param(
    [int] $Size,
    [string] $FileName,
    [bool] $Maskable = $false
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(22, 136, 242))

  $margin = if ($Maskable) { [int]($Size * 0.22) } else { [int]($Size * 0.13) }
  $card = [System.Drawing.Rectangle]::new($margin, [int]($margin * 1.02), $Size - 2 * $margin, $Size - 2 * $margin)
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $graphics.FillRectangle($white, $card)

  $headerHeight = [int]($card.Height * 0.25)
  $headerBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(223, 242, 255))
  $graphics.FillRectangle($headerBrush, $card.X, $card.Y, $card.Width, $headerHeight)

  $barWidth = [int]($card.Width * 0.14)
  $gap = [int]($card.Width * 0.12)
  $baseY = $card.Bottom - [int]($card.Height * 0.12)
  $barX = $card.X + [int]($card.Width * 0.18)
  $colors = @(
    [System.Drawing.Color]::FromArgb(118, 199, 255),
    [System.Drawing.Color]::FromArgb(49, 164, 245),
    [System.Drawing.Color]::FromArgb(8, 117, 223)
  )
  $heights = @(0.25, 0.42, 0.58)
  for ($index = 0; $index -lt 3; $index++) {
    $height = [int]($card.Height * $heights[$index])
    $brush = [System.Drawing.SolidBrush]::new($colors[$index])
    $graphics.FillRectangle($brush, $barX + $index * ($barWidth + $gap), $baseY - $height, $barWidth, $height)
    $brush.Dispose()
  }

  $path = Join-Path $assetDirectory $FileName
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $headerBrush.Dispose()
  $white.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-CongDoanIcon -Size 192 -FileName "icon-192.png"
New-CongDoanIcon -Size 512 -FileName "icon-512.png"
New-CongDoanIcon -Size 512 -FileName "icon-maskable-512.png" -Maskable $true
New-CongDoanIcon -Size 180 -FileName "apple-touch-icon.png"
