void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Normalize coordinates
    vec2 uv = fragCoord / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;
    
    // Grid parameters
    float gridSize = 8.0;
    
    // COLOR PARAMETERS
    vec3 coreColor = vec3(1.0, 1.0, 1.0);      // White core - CHANGE THIS
    vec3 bloomColor = vec3(1.0, 0.9, 0.7);     // Warm yellow glow - CHANGE THIS
    
    // BLOOM CONTROLS
    float bloomIntensity = 0.8;
    float bloomRadius = 2.0;
    float bloomFalloff = 1.2;
    float bloomPulse = 0.5;

    //PULSE CONTROL
    float pulseSpeed = 3.0;
    float minDotSize = 0.2;        // Minimum dot size (was 0.2 base)
    float maxDotSize = 0.35;        // Maximum dot size (was 0.2 + 0.15 = 0.35)


    // We'll accumulate bloom from neighboring cells
    float totalBloom = 0.0;
    float totalCore = 0.0;
    
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
            float dotSize = minDotSize + (maxDotSize - minDotSize) * pulse;
            
            // Core dot (sharp) - only for the center cell to avoid duplicate cores
            if (i == 0 && j == 0) {
                float core = 1.0 - smoothstep(dotSize - 0.03, dotSize + 0.03, dist);
                totalCore = core;
            }
            
            // Bloom contribution from this cell (all cells contribute to bloom)
            float bloomPulseFactor = 1.0 - bloomPulse + bloomPulse * pulse;
            
            // Calculate distance for bloom (use actual distance to this cell's center)
            vec2 cellCenter = (cell + 0.5) / gridSize - uv;
            float bloomDist = length(cellCenter * gridSize); // Distance in cell units
            
            float bloom = exp(-pow(bloomDist * bloomRadius, bloomFalloff)) * bloomIntensity * bloomPulseFactor;
            totalBloom += bloom;
        }
    }
    
    // Combine core and bloom
    float dot = max(totalCore, totalBloom);
    dot = min(dot, 1.2); // Allow slight overbright for glow effect
    
    // Apply colors
    vec3 finalColor = coreColor * totalCore + bloomColor * totalBloom * 0.8;
    
    fragColor = vec4(finalColor, 1.0);
}