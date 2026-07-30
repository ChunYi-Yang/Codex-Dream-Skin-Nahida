[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$WindowsRoot = Split-Path -Parent $PSScriptRoot
$ProjectRoot = Split-Path -Parent $WindowsRoot
$NahidaFolderName = -join @([char]0x7EB3, [char]0x897F, [char]0x59B2)
$SourceRoot = Join-Path $ProjectRoot $NahidaFolderName
$CursorFolderName = 'NXD' + [char]0x5149 + [char]0x6807 + '4.0'
$CursorRoot = Join-Path $ProjectRoot $CursorFolderName
$AssetsRoot = Join-Path $WindowsRoot 'assets'

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $AssetsRoot | Out-Null

function Export-CroppedImage {
  param(
    [Parameter(Mandatory)] [string]$InputPath,
    [Parameter(Mandatory)] [string]$OutputPath,
    [Parameter(Mandatory)] [System.Drawing.Rectangle]$Crop,
    [Parameter(Mandatory)] [int]$Width,
    [Parameter(Mandatory)] [int]$Height
  )

  $source = [System.Drawing.Image]::FromFile($InputPath)
  try {
    $bitmap = [System.Drawing.Bitmap]::new(
      $Width,
      $Height,
      [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
    )
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage(
          $source,
          [System.Drawing.Rectangle]::new(0, 0, $Width, $Height),
          $Crop.X,
          $Crop.Y,
          $Crop.Width,
          $Crop.Height,
          [System.Drawing.GraphicsUnit]::Pixel
        )
      } finally {
        $graphics.Dispose()
      }
      $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

function New-TransparentCanvas {
  param([int]$Width, [int]$Height)

  $bitmap = [System.Drawing.Bitmap]::new(
    $Width,
    $Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $bitmap.SetResolution(96, 96)
  return $bitmap
}

function Initialize-Graphics {
  param([System.Drawing.Bitmap]$Bitmap)

  $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  return $graphics
}

function Draw-Leaf {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$CenterX,
    [float]$CenterY,
    [float]$Scale,
    [float]$Rotation,
    [System.Drawing.Color]$Fill,
    [System.Drawing.Color]$Outline
  )

  $state = $Graphics.Save()
  try {
    $Graphics.TranslateTransform($CenterX, $CenterY)
    $Graphics.RotateTransform($Rotation)
    $Graphics.ScaleTransform($Scale, $Scale)

    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    try {
      $path.StartFigure()
      $path.AddBezier(0, -54, 42, -34, 40, 15, 0, 48)
      $path.AddBezier(0, 48, -40, 15, -42, -34, 0, -54)
      $path.CloseFigure()

      $glow = [System.Drawing.Pen]::new(
        [System.Drawing.Color]::FromArgb(34, 226, 255, 157),
        8
      )
      $brush = [System.Drawing.SolidBrush]::new($Fill)
      $outlinePen = [System.Drawing.Pen]::new($Outline, 2.1)
      $veinPen = [System.Drawing.Pen]::new(
        [System.Drawing.Color]::FromArgb(150, 255, 255, 221),
        1.2
      )
      try {
        $Graphics.DrawPath($glow, $path)
        $Graphics.FillPath($brush, $path)
        $Graphics.DrawPath($outlinePen, $path)
        $Graphics.DrawLine($veinPen, 0, 37, 0, -35)
      } finally {
        $glow.Dispose()
        $brush.Dispose()
        $outlinePen.Dispose()
        $veinPen.Dispose()
      }
    } finally {
      $path.Dispose()
    }
  } finally {
    $Graphics.Restore($state)
  }
}

function Draw-Sparkle {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Radius,
    [System.Drawing.Color]$Color
  )

  $pen = [System.Drawing.Pen]::new($Color, [math]::Max(1.2, $Radius / 5))
  try {
    $Graphics.DrawLine($pen, $X - $Radius, $Y, $X + $Radius, $Y)
    $Graphics.DrawLine($pen, $X, $Y - $Radius, $X, $Y + $Radius)
    $Graphics.DrawLine($pen, $X - $Radius * .55, $Y - $Radius * .55, $X + $Radius * .55, $Y + $Radius * .55)
    $Graphics.DrawLine($pen, $X - $Radius * .55, $Y + $Radius * .55, $X + $Radius * .55, $Y - $Radius * .55)
  } finally {
    $pen.Dispose()
  }
}

function Get-AniFirstFrameBitmap {
  param([Parameter(Mandatory)] [string]$InputPath)

  $bytes = [System.IO.File]::ReadAllBytes($InputPath)
  $chunkStart = -1
  for ($index = 0; $index -le $bytes.Length - 8; $index++) {
    if ($bytes[$index] -eq 0x69 -and $bytes[$index + 1] -eq 0x63 -and
      $bytes[$index + 2] -eq 0x6f -and $bytes[$index + 3] -eq 0x6e) {
      $chunkStart = $index + 8
      break
    }
  }
  if ($chunkStart -lt 0) { throw "No icon frame was found in $InputPath" }

  $imageOffset = [BitConverter]::ToUInt32($bytes, $chunkStart + 18)
  $dibStart = $chunkStart + [int]$imageOffset
  $headerSize = [BitConverter]::ToInt32($bytes, $dibStart)
  $width = [math]::Abs([BitConverter]::ToInt32($bytes, $dibStart + 4))
  $storedHeight = [math]::Abs([BitConverter]::ToInt32($bytes, $dibStart + 8))
  $height = [int]($storedHeight / 2)
  $bitsPerPixel = [BitConverter]::ToInt16($bytes, $dibStart + 14)
  $compression = [BitConverter]::ToInt32($bytes, $dibStart + 16)
  if ($headerSize -lt 40 -or $width -lt 1 -or $height -lt 1 -or
    $bitsPerPixel -ne 32 -or $compression -ne 0) {
    throw "Unsupported ANI cursor frame in $InputPath"
  }

  $pixelStart = $dibStart + $headerSize
  $rowBytes = $width * 4
  if ($pixelStart + ($rowBytes * $height) -gt $bytes.Length) {
    throw "Truncated ANI cursor frame in $InputPath"
  }

  $bitmap = [System.Drawing.Bitmap]::new(
    $width,
    $height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $rect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
  $data = $bitmap.LockBits(
    $rect,
    [System.Drawing.Imaging.ImageLockMode]::WriteOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  try {
    for ($y = 0; $y -lt $height; $y++) {
      $sourceOffset = $pixelStart + (($height - 1 - $y) * $rowBytes)
      $destination = [IntPtr]::Add($data.Scan0, $y * $data.Stride)
      [System.Runtime.InteropServices.Marshal]::Copy($bytes, $sourceOffset, $destination, $rowBytes)
    }
  } finally {
    $bitmap.UnlockBits($data)
  }
  return $bitmap
}

function Get-AlphaBounds {
  param([System.Drawing.Bitmap]$Bitmap)

  $left = $Bitmap.Width
  $top = $Bitmap.Height
  $right = -1
  $bottom = -1
  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($Bitmap.GetPixel($x, $y).A -gt 8) {
        $left = [math]::Min($left, $x)
        $top = [math]::Min($top, $y)
        $right = [math]::Max($right, $x)
        $bottom = [math]::Max($bottom, $y)
      }
    }
  }
  if ($right -lt $left -or $bottom -lt $top) {
    return [System.Drawing.Rectangle]::new(0, 0, $Bitmap.Width, $Bitmap.Height)
  }
  return [System.Drawing.Rectangle]::new(
    $left,
    $top,
    $right - $left + 1,
    $bottom - $top + 1
  )
}

function Export-DecorationAtlas {
  param([string]$OutputPath)

  $choose = -join @([char]0x9009, [char]0x62E9)
  $cursorFiles = @(
    ((-join @([char]0x6B63, [char]0x5E38)) + $choose + '.ani'),
    ((-join @([char]0x6587, [char]0x672C)) + $choose + '.ani'),
    ((-join @([char]0x94FE, [char]0x63A5)) + $choose + '.ani'),
    (([char]0x5FD9) + '.ani')
  )

  $bitmap = New-TransparentCanvas -Width 1024 -Height 512
  try {
    $graphics = Initialize-Graphics -Bitmap $bitmap
    try {
      $sparkleColors = @(
        [System.Drawing.Color]::FromArgb(214, 218, 176, 69),
        [System.Drawing.Color]::FromArgb(220, 249, 248, 207),
        [System.Drawing.Color]::FromArgb(220, 186, 233, 92),
        [System.Drawing.Color]::FromArgb(210, 77, 169, 148)
      )
      for ($tile = 0; $tile -lt $cursorFiles.Count; $tile++) {
        $cursor = Get-AniFirstFrameBitmap -InputPath (Join-Path $CursorRoot $cursorFiles[$tile])
        try {
          $source = Get-AlphaBounds -Bitmap $cursor
          $maxEdge = [math]::Max($source.Width, $source.Height)
          $scale = 176 / $maxEdge
          $drawWidth = [int][math]::Round($source.Width * $scale)
          $drawHeight = [int][math]::Round($source.Height * $scale)
          $centerX = ($tile * 256) + 128
          $destination = [System.Drawing.Rectangle]::new(
            [int]($centerX - ($drawWidth / 2)),
            [int](250 - ($drawHeight / 2)),
            $drawWidth,
            $drawHeight
          )
          $graphics.DrawImage(
            $cursor,
            $destination,
            $source.X,
            $source.Y,
            $source.Width,
            $source.Height,
            [System.Drawing.GraphicsUnit]::Pixel
          )
          Draw-Sparkle $graphics ($centerX - 58) 126 9 $sparkleColors[$tile]
          Draw-Sparkle $graphics ($centerX + 60) 380 11 $sparkleColors[($tile + 1) % 4]
        } finally {
          $cursor.Dispose()
        }
      }
    } finally {
      $graphics.Dispose()
    }
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $bitmap.Dispose()
  }
}

function Export-SceneLayer {
  param([string]$OutputPath)

  $bitmap = New-TransparentCanvas -Width 1024 -Height 1024
  try {
    $graphics = Initialize-Graphics -Bitmap $bitmap
    try {
      $green = [System.Drawing.Color]::FromArgb(116, 92, 166, 52)
      $lime = [System.Drawing.Color]::FromArgb(132, 201, 235, 109)
      $teal = [System.Drawing.Color]::FromArgb(104, 61, 157, 145)
      $cream = [System.Drawing.Color]::FromArgb(150, 255, 250, 210)
      $gold = [System.Drawing.Color]::FromArgb(138, 222, 185, 91)
      $outline = [System.Drawing.Color]::FromArgb(150, 232, 246, 174)

      $ringWide = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(24, 161, 214, 111), 42)
      $ring = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(92, 214, 239, 144), 5)
      $ringInner = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(58, 90, 171, 155), 2)
      try {
        $graphics.DrawEllipse($ringWide, 162, 162, 700, 700)
        $graphics.DrawArc($ring, 162, 162, 700, 700, 198, 242)
        $graphics.DrawArc($ringInner, 212, 212, 600, 600, 14, 306)
      } finally {
        $ringWide.Dispose()
        $ring.Dispose()
        $ringInner.Dispose()
      }

      foreach ($entry in @(
        @(208, 458, 1.35, -68, $green),
        @(247, 300, 1.05, -30, $teal),
        @(330, 214, .86, 8, $lime),
        @(816, 462, 1.32, 68, $green),
        @(778, 300, 1.02, 30, $teal),
        @(694, 215, .84, -8, $lime),
        @(302, 790, 1.1, -142, $teal),
        @(724, 790, 1.1, 142, $green)
      )) {
        Draw-Leaf $graphics $entry[0] $entry[1] $entry[2] $entry[3] $entry[4] $outline
      }

      foreach ($rotation in @(0, 90, 180, 270)) {
        Draw-Leaf $graphics 512 590 1.32 $rotation $green $outline
      }
      Draw-Sparkle $graphics 512 590 28 $cream
      Draw-Sparkle $graphics 512 332 18 $gold
      Draw-Sparkle $graphics 344 494 10 $cream
      Draw-Sparkle $graphics 688 470 12 $lime
      Draw-Sparkle $graphics 430 748 9 $teal
      Draw-Sparkle $graphics 604 760 10 $gold
    } finally {
      $graphics.Dispose()
    }
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $bitmap.Dispose()
  }
}

$heroSource = Join-Path $SourceRoot '386062b8f1876a27a8168a2bab751456_4170308972841738428.jpg'
$backgroundSource = Join-Path $SourceRoot 'image2.jpg'
$sidebarSource = Join-Path $SourceRoot '2ccec821fd1cfe5adf2f59ef400cc7dd_3533226177043710105.jpg'
$rightPanelSource = Join-Path $SourceRoot 'd46fc04cfe48ec59c4f1347f30d0ab3d_8002798171564402905.png'
$portraitSource = Join-Path $SourceRoot '57755460c6f1a69ad72b106468b28822.png'

Copy-Item -LiteralPath $heroSource -Destination (Join-Path $AssetsRoot 'nahida-hero.jpg') -Force
Copy-Item -LiteralPath $backgroundSource -Destination (Join-Path $AssetsRoot 'nahida-background.jpg') -Force
Copy-Item -LiteralPath $rightPanelSource -Destination (Join-Path $AssetsRoot 'nahida-right-panel.png') -Force
Export-CroppedImage `
  -InputPath $sidebarSource `
  -OutputPath (Join-Path $AssetsRoot 'nahida-sidebar.jpg') `
  -Crop ([System.Drawing.Rectangle]::new(0, 24, 600, 1050)) `
  -Width 640 `
  -Height 1120
Export-CroppedImage `
  -InputPath $portraitSource `
  -OutputPath (Join-Path $AssetsRoot 'nahida-portrait.jpg') `
  -Crop ([System.Drawing.Rectangle]::new(0, 72, 640, 775)) `
  -Width 760 `
  -Height 920
Export-DecorationAtlas -OutputPath (Join-Path $AssetsRoot 'nahida-decorations.png')
Export-SceneLayer -OutputPath (Join-Path $AssetsRoot 'nahida-scene.png')

Write-Host "Generated Nahida theme assets in $AssetsRoot"
