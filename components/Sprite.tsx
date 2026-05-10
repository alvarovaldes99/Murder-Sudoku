import React, { useState, useEffect } from 'react';

interface SpriteProps {
  sheetUrl: string;
  cols: number;
  rows: number;
  row: number;
  col: number;
  removeBackground?: boolean;
  className?: string;
  size?: number | string;
  bgColor?: string;
}

const cachedSprites: Record<string, Record<string, string>> = {};
const processQueue: Record<string, ((sprites: Record<string, string>) => void)[]> = {};
const isProcessingQueue: Record<string, boolean> = {};

export function useSpriteSheet(url: string, cols: number, rows: number, removeBg: boolean) {
  const cacheKey = `${url}_${cols}x${rows}_${removeBg}`;
  
  const [sprites, setSprites] = useState<Record<string, string> | null>(() =>
    cachedSprites[cacheKey] || null
  );

  useEffect(() => {
    if (cachedSprites[cacheKey]) {
      // Use Promise.resolve to avoid synchronous setState warning
      Promise.resolve().then(() => setSprites(cachedSprites[cacheKey]));
      return;
    }

    if (!processQueue[cacheKey]) {
      processQueue[cacheKey] = [];
    }

    if (isProcessingQueue[cacheKey]) {
      processQueue[cacheKey].push(setSprites);
      return;
    }

    isProcessingQueue[cacheKey] = true;
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const cellW = img.width / cols;
      const cellH = img.height / rows;
      
      const isFloor = url.includes('floor');
      const isCharacter = url.includes('character');
      let cropW = cellW;
      let cropH = cellH;
      let cropXOffset = 0;
      let cropYOffset = 0;
      
      const sheetSprites: Record<string, string> = {};
      
      const targetR = 255;
      const targetG = 0;
      const targetB = 255;
      
      if (isFloor) {
         cropXOffset = cellW * 0.13;
         cropYOffset = cellH * 0.13;
         cropW = cellW - cropXOffset * 2;
         cropH = cellH - cropYOffset * 2;
      }
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let currentCropW = cropW;
          let currentCropH = cropH;
          let currentCropX = c * cellW + cropXOffset;
          let currentCropY = r * cellH + cropYOffset;
          
          if (isFloor && url.includes('tienda') && r === 1 && c === 4) {
            currentCropW = cropW * 0.75;
            currentCropH = cropH * 0.75;
            // Bias towards top-left to hide bottom-right artifact
            currentCropX += cropW * 0.05;
            currentCropY += cropH * 0.05;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = cropW;
          canvas.height = cropH;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          
          ctx.drawImage(
            img, 
            currentCropX, currentCropY, currentCropW, currentCropH,
            0, 0, cropW, cropH
          );
          
          if (removeBg) {
            const imageData = ctx.getImageData(0, 0, cropW, cropH);
            const data = imageData.data;
            
            let minX = cropW, minY = cropH, maxX = 0, maxY = 0;
            let hasVisiblePixels = false;
            
            for (let i = 0; i < data.length; i += 4) {
              const red = data[i];
              const green = data[i + 1];
              const blue = data[i + 2];
              
              const distance = Math.sqrt(
                Math.pow(red - targetR, 2) + 
                Math.pow(green - targetG, 2) + 
                Math.pow(blue - targetB, 2)
              );
              
              if (distance < 140 || (red > 200 && green < 100 && blue > 200)) {
                data[i + 3] = 0; 
              } else if (distance < 170) {
                data[i + 3] = Math.floor(((distance - 140) / 30) * 255);
              }

              // Higher threshold for bounding box to ignore shadows or noise
              if (data[i + 3] > 150) {
                hasVisiblePixels = true;
                const px = (i / 4) % cropW;
                const py = Math.floor((i / 4) / cropW);
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
              }
            }
            ctx.putImageData(imageData, 0, 0);

            const isProp = url.includes('prop');
            if (isProp && hasVisiblePixels) {
              const trimW = maxX - minX + 1;
              const trimH = maxY - minY + 1;
              
              // Add padding and create a SQUARE canvas to guarantee perfect centering
              const maxDim = Math.max(trimW, trimH);
              const padding = maxDim * 0.05;
              const finalSize = maxDim + padding * 2;
              
              const trimmedCanvas = document.createElement('canvas');
              trimmedCanvas.width = finalSize;
              trimmedCanvas.height = finalSize;
              const trimmedCtx = trimmedCanvas.getContext('2d');
              if (trimmedCtx) {
                const offsetX = (finalSize - trimW) / 2;
                const offsetY = (finalSize - trimH) / 2;
                
                trimmedCtx.drawImage(
                  canvas,
                  minX, minY, trimW, trimH,
                  offsetX, offsetY, trimW, trimH
                );
                sheetSprites[`${r}_${c}`] = trimmedCanvas.toDataURL('image/png');
                continue;
              }
            }
          }
          
          sheetSprites[`${r}_${c}`] = canvas.toDataURL('image/png');
        }
      }
      
      cachedSprites[cacheKey] = sheetSprites;
      setSprites(sheetSprites);
      
      processQueue[cacheKey].forEach(cb => cb(sheetSprites));
      processQueue[cacheKey].length = 0;
    };
  }, [url, cols, rows, removeBg, cacheKey]);

  return sprites;
}

export function GraphicSprite({ sheetUrl, cols, rows, row, col, removeBackground = true, className = '', size = 48, bgColor }: SpriteProps) {
  const sprites = useSpriteSheet(sheetUrl, cols, rows, removeBackground);
  const isFloor = sheetUrl.includes('floor');
  const isCharacter = sheetUrl.includes('character');

  if (!sprites || !sprites[`${row}_${col}`]) {
    return (
      <div 
        className={`inline-block shrink-0 bg-stone-200 animate-pulse ${className} ${isFloor ? '' : 'rounded-full'}`} 
        style={{ width: size, height: size }} 
      />
    );
  }

  return (
    <div 
      className={`inline-block shrink-0 ${isCharacter && !bgColor ? 'bg-white rounded-full' : ''} ${bgColor ? `${bgColor} rounded-full` : ''} ${className}`}
      style={{
        width: isFloor ? '100%' : size,
        height: isFloor ? '100%' : size,
        backgroundImage: `url(${sprites[`${row}_${col}`]})`,
        backgroundSize: isFloor ? 'cover' : 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        boxShadow: isCharacter ? 'inset 0 0 0 2px rgba(0,0,0,0.05)' : 'none'
      }}
    />
  );
}

const basePath = process.env.NODE_ENV === 'production' ? '/Murder-Sudoku' : '';

// Wrapper for existing Character sprite code
export function CharacterSprite({ row, col, className = '', size = 48, bgColor }: Omit<SpriteProps, 'sheetUrl'|'cols'|'rows'>) {
  return <GraphicSprite sheetUrl={`${basePath}/characters.jpg`} cols={5} rows={2} row={row} col={col} className={className} size={size} bgColor={bgColor} />;
}

interface EnvironmentSpriteProps extends Omit<SpriteProps, 'sheetUrl'|'cols'|'rows'> {
  ambientName?: string;
}

export function PropSprite({ row, col, className = '', size = 48, ambientName = 'Parque' }: EnvironmentSpriteProps) {
  const normalizedAmbientName = ambientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cols = normalizedAmbientName === 'iglesia' || normalizedAmbientName === 'tienda' ? 4 : 5;
  return <GraphicSprite sheetUrl={`${basePath}/props-${normalizedAmbientName}.jpg`} cols={cols} rows={2} row={row} col={col} className={className} size={size} removeBackground={true} />;
}

export function FloorSprite({ row, col, className = '', size = 48, ambientName = 'Parque' }: EnvironmentSpriteProps) {
  const normalizedAmbientName = ambientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return <GraphicSprite sheetUrl={`${basePath}/floors-${normalizedAmbientName}.jpg`} cols={5} rows={2} row={row} col={col} className={`w-full h-full ${className}`} size={size} removeBackground={true} />;
}


