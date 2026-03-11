/*{
  "DESCRIPTION": "Pulsating Dot Grid with Size-Based Color Mixing",
  "CREDIT": "NAVA MICKAEL, Inspiré par le décor des lives on KEXP",
  "ISFVSN": "2",
  "CATEGORIES": [
    "Generator"
  ],
  "INPUTS": [
    {
      "NAME": "gridSize",
      "TYPE": "float",
      "DEFAULT": 8.0,
      "MIN": 2.0,
      "MAX": 30.0,
      "LABEL": "Grid Size"
    },
    {
      "NAME": "coreColorSmall",
      "TYPE": "color",
      "DEFAULT": [0.2, 0.6, 1.0, 1.0],
      "LABEL": "Core Color (Small)"
    },
    {
      "NAME": "coreColorLarge",
      "TYPE": "color",
      "DEFAULT": [1.0, 0.9, 0.5, 1.0],
      "LABEL": "Core Color (Large)"
    },
    {
      "NAME": "bloomColorSmall",
      "TYPE": "color",
      "DEFAULT": [0.4, 0.8, 1.0, 1.0],
      "LABEL": "Bloom Color (Small)"
    },
    {
      "NAME": "bloomColorLarge",
      "TYPE": "color",
      "DEFAULT": [1.0, 0.9, 0.7, 1.0],
      "LABEL": "Bloom Color (Large)"
    },
    {
      "NAME": "bloomIntensity",
      "TYPE": "float",
      "DEFAULT": 1.5,
      "MIN": 0.0,
      "MAX": 5.0,
      "LABEL": "Bloom Intensity"
    },
    {
      "NAME": "bloomRadius",
      "TYPE": "float",
      "DEFAULT": 2.5,
      "MIN": 0.5,
      "MAX": 5.0,
      "LABEL": "Bloom Radius"
    },
    {
      "NAME": "bloomFalloff",
      "TYPE": "float",
      "DEFAULT": 1.5,
      "MIN": 0.5,
      "MAX": 3.0,
      "LABEL": "Bloom Falloff"
    },
    {
      "NAME": "bloomPulse",
      "TYPE": "float",
      "DEFAULT": 0.5,
      "MIN": 0.0,
      "MAX": 1.0,
      "LABEL": "Bloom Pulse Amount"
    },
    {
      "NAME": "pulseSpeed",
      "TYPE": "float",
      "DEFAULT": 1.0,
      "MIN": 0.0,
      "MAX": 5.0,
      "LABEL": "Pulse Speed"
    },
    {
      "NAME": "minDotSize",
      "TYPE": "float",
      "DEFAULT": 0.0,
      "MIN": 0.0,
      "MAX": 0.45,
      "LABEL": "Min Dot Size"
    },
    {
      "NAME": "maxDotSize",
      "TYPE": "float",
      "DEFAULT": 0.35,
      "MIN": 0.1,
      "MAX": 0.45,
      "LABEL": "Max Dot Size"
    }
  ]
}*/

void main() {
    // Get normalized coordinates
    vec2 uv = isf_FragNormCoord.xy;
    
    // Fix aspect ratio to keep dots square
    uv.x *= RENDERSIZE.x / RENDERSIZE.y;
    
    // Grid parameters
    float gSize = gridSize;
    
    // Accumulators
    float totalBloom = 0.0;
    float totalCore = 0.0;
    float dotSize = 0.0; // Will store the size of the center cell
    
    // Sample a 3x3 neighborhood of cells
    for (int i = -1; i <= 1; i++) { 
        for (int j = -1; j <= 1; j++) {
            // Current cell being sampled
            vec2 offset = vec2(float(i), float(j));
            
            // Calculate the cell coordinates for this neighbor
            vec2 gridUV = uv * gSize + offset;
            vec2 cell = floor(gridUV);
            vec2 cellUV = fract(gridUV) - 0.5;
            
            // Distance from this cell's center
            float dist = length(cellUV + offset);
            
            // Unique time offset for this cell
            float timeOffset = dot(cell, vec2(1.2, 3.7)) * 2.0;
            float pulse = 0.5 + 0.5 * sin(TIME * pulseSpeed + timeOffset);
            
            // Dot size for this cell
            float currentDotSize = minDotSize + (maxDotSize - minDotSize) * pulse;
            
            // Store dot size from center cell for color calculation
            if (i == 0 && j == 0) {
                dotSize = currentDotSize;
            }
            
            // Core dot (sharp) - only from center cell
            if (i == 0 && j == 0) {
                float core = 1.0 - smoothstep(currentDotSize - 0.03, currentDotSize + 0.03, dist);
                totalCore = core;
            }
            
            // Bloom contribution
            float bloomPulseFactor = 1.0 - bloomPulse + bloomPulse * pulse;
            
            // Calculate distance for bloom
            vec2 cellCenter = (cell + 0.5) / gSize - uv;
            float bloomDist = length(cellCenter * gSize);
            
            // Scale bloom with dot size
            float dotSizeFactor = maxDotSize > 0.0 ? currentDotSize / maxDotSize : 0.0;
            float scaledBloomRadius = bloomRadius * (0.5 + 1.5 * dotSizeFactor);
            float intensityScale = dotSizeFactor * (0.8 + 0.4 * pulse);
            
            float bloom = exp(-pow(bloomDist * scaledBloomRadius, bloomFalloff)) 
                        * bloomIntensity 
                        * bloomPulseFactor 
                        * intensityScale;
            
            totalBloom += bloom;
        }
    }
    
    // Calculate color mix factor based on dot size
    // This creates a smooth gradient between small and large colors
    float sizeRange = maxDotSize - minDotSize;
    float sizeRatio = sizeRange > 0.0 ? (dotSize - minDotSize) / sizeRange : 0.5;
    sizeRatio = clamp(sizeRatio, 0.0, 1.0); // Ensure it's in valid range
    
    // Mix colors based on size
    vec3 mixedCoreColor = mix(coreColorSmall.rgb, coreColorLarge.rgb, sizeRatio);
    vec3 mixedBloomColor = mix(bloomColorSmall.rgb, bloomColorLarge.rgb, sizeRatio);
    
    // Combine core and bloom
    float dot = max(totalCore, totalBloom);
    dot = min(dot, 1.2);
    
    // Apply colors with dynamic mixing
    vec3 finalColor = mixedCoreColor * totalCore + mixedBloomColor * totalBloom * 0.8;
    
    gl_FragColor = vec4(finalColor, 1.0);
}