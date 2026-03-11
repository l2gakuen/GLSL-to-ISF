void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Normalize coordinates
    vec2 uv = fragCoord / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;
    
    // Grid parameters
    float gridSize = 8.0; 
    
    // COLOR PARAMETERS - now we'll have color ranges
    vec3 coreColorSmall = vec3(0.2, 0.6, 1.0);   // Blue when small
    vec3 coreColorLarge = vec3(1.0, 0.9, 0.5);   // Warm yellow when large
    vec3 bloomColorSmall = vec3(0.4, 0.8, 1.0);  // Blue glow when small
    vec3 bloomColorLarge = vec3(1.0, 0.9, 0.7);  // Orange glow when large
    
    // BLOOM CONTROLS
    float bloomIntensity = 1.5; 
    float bloomRadius = 2.5;
    float bloomFalloff = 1.5;
    float bloomPulse = 0.5;

    // PULSE CONTROL
    float pulseSpeed = 1.0;
    float minDotSize = 0.1;        // Minimum dot size (can disappear) : MAX 0.45
    float maxDotSize = 0.35;        // Maximum dot size : MAX 0.45

    // We'll accumulate bloom from neighboring cells
    float totalBloom = 0.0;
    float totalCore = 0.0;
    float dotSize = 0.0; // Store dot size for color calculation
    
    // Sample a 3x3 neighborhood of cells to get proper light bleed
    for (int i = -1; i <= 1; i++) { 
        for (int j = -1; j <= 1; j++) {
            // Current cell being sampled
            vec2 offset = vec2(float(i), float(j));
            
            // Calculate the cell coordinates for this neighbor
            vec2 gridUV = uv * gridSize + offset;
            vec2 cell = floor(gridUV);
            vec2 cellUV = fract(gridUV) - 0.5;
            
            // Distance from this cell's center
            float dist = length(cellUV + offset); // Offset accounts for neighbor position
            
            // Unique time offset for this cell
            float timeOffset = dot(cell, vec2(1.2, 3.7)) * 2.0;
            float pulse = 0.5 + 0.5 * sin(iTime * pulseSpeed + timeOffset);
            
            // Dot size for this cell
            float currentDotSize = minDotSize + (maxDotSize - minDotSize) * pulse;
            
            // Store dot size for color calculation (from center cell)
            if (i == 0 && j == 0) {
                dotSize = currentDotSize;
            }
            
            // Core dot (sharp) - only for the center cell to avoid duplicate cores
            if (i == 0 && j == 0) {
                float core = 1.0 - smoothstep(currentDotSize - 0.03, currentDotSize + 0.03, dist);
                totalCore = core;
            }
            
            // Bloom contribution from this cell (all cells contribute to bloom)
            float bloomPulseFactor = 1.0 - bloomPulse + bloomPulse * pulse;
            
            // Calculate distance for bloom (use actual distance to this cell's center)
            vec2 cellCenter = (cell + 0.5) / gridSize - uv;
            float bloomDist = length(cellCenter * gridSize); // Distance in cell units
            
            // Scale bloom with actual dot size
            float dotSizeFactor = currentDotSize / maxDotSize; // Range: 0 to 1
            
            // Scale radius with dot size (no bloom when dot is invisible)
            float scaledBloomRadius = bloomRadius * (0.5 + 1.5 * dotSizeFactor);
            
            // Scale intensity with dot size (no bloom when dot is invisible)
            float intensityScale = dotSizeFactor * (0.8 + 0.4 * pulse);
            
            float bloom = exp(-pow(bloomDist * scaledBloomRadius, bloomFalloff)) 
                        * bloomIntensity 
                        * bloomPulseFactor 
                        * intensityScale;
            
            totalBloom += bloom;
        }
    }
    
    // Calculate color mix factor based on dot size
    float sizeRatio = (dotSize - minDotSize) / (maxDotSize - minDotSize); // 0 to 1 range
    
    // Mix colors based on size (0 = small/min, 1 = large/max)
    vec3 mixedCoreColor = mix(coreColorSmall, coreColorLarge, sizeRatio);
    vec3 mixedBloomColor = mix(bloomColorSmall, bloomColorLarge, sizeRatio);
    
    // Combine core and bloom
    float dot = max(totalCore, totalBloom);
    dot = min(dot, 1.2); // Allow slight overbright for glow effect
    
    // Apply colors with dynamic mixing
    vec3 finalColor = mixedCoreColor * totalCore + mixedBloomColor * totalBloom * 0.8;
    
    fragColor = vec4(finalColor, 1.0);
}