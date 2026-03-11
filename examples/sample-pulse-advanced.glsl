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
    float bloomPulse = .5;
    
    // INFINITE MIRROR PARAMETERS
    int numLayers = 2;                          // Number of Z layers (increase for more depth)
    float layerSpacing = 1.3;                    // Distance between layers
    float layerFade = 0.5;                       // How much each layer fades (0.0-1.0)
    float layerScale = 0.8;                       // Scale factor for each successive layer
    float layerTimeScale = 1.5;                   // Time speed multiplier for deeper layers
    
    // We'll accumulate all layers
    vec3 accumulatedColor = vec3(0.0);
    
    // Loop through Z layers (like infinite mirrors)
    for (int layer = 0; layer < numLayers; layer++) {
        float layerDepth = float(layer);
        
        // Calculate layer fade (deeper layers are dimmer)
        float fade = pow(layerFade, layerDepth);
        
        // Calculate layer scale (deeper layers are smaller)
        float scale = pow(layerScale, layerDepth);
        
        // Apply scaling to UV for this layer (creates zoom effect)
        vec2 layerUV = (uv - 0.5 * vec2(iResolution.x / iResolution.y, 1.0)) * scale + 0.5 * vec2(iResolution.x / iResolution.y, 1.0);
        
        // Layer-specific time offset for pulsing (deeper layers pulse at different rates)
        float layerTime = iTime * (1.0 + layerDepth * layerTimeScale);
        
        // Accumulate bloom from neighboring cells for this layer
        float layerBloom = 0.0;
        float layerCore = 0.0;
        
        // Sample neighborhood for this layer
        for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
                vec2 offset = vec2(float(i), float(j));
                
                // Calculate cell coordinates for this layer
                vec2 gridUV = layerUV * gridSize + offset;
                vec2 cell = floor(gridUV);
                vec2 cellUV = fract(gridUV) - 0.5;
                
                // Distance from cell center
                float dist = length(cellUV + offset);
                
                // Unique time offset for this cell (with layer modulation)
                float timeOffset = dot(cell, vec2(1.2, 3.7)) * 2.0 + layerDepth * 5.0;
                float pulse = 0.5 + 0.5 * sin(layerTime * 3.0 + timeOffset);
                
                // Dot size for this cell (also scales with layer)
                float dotSize = (0.2 + 0.15 * pulse) * (0.8 + 0.2 * sin(layerDepth));
                
                // Core dot - only from center cell of this layer
                if (i == 0 && j == 0) {
                    float core = 1.0 - smoothstep(dotSize - 0.03, dotSize + 0.03, dist);
                    layerCore = core * fade; // Apply fade to core
                }
                
                // Bloom contribution
                float bloomPulseFactor = 1.0 - bloomPulse + bloomPulse * pulse;
                
                // Distance to cell center for bloom
                vec2 cellCenter = (cell + 0.5) / gridSize - layerUV;
                float bloomDist = length(cellCenter * gridSize);
                
                float bloom = exp(-pow(bloomDist * bloomRadius, bloomFalloff)) * bloomIntensity * bloomPulseFactor * fade;
                layerBloom += bloom;
            }
        }
        
        // Combine core and bloom for this layer
        float layerDot = max(layerCore, layerBloom);
        
        // Apply colors with potential layer-based variation
        vec3 layerCoreColor = coreColor;
        vec3 layerBloomColor = bloomColor;
        
        // Optional: Shift colors in deeper layers
        // layerCoreColor = vec3(0.8 + 0.2 * sin(layerDepth), 0.8 + 0.2 * cos(layerDepth * 2.0), 1.0);
        // layerBloomColor = layerCoreColor * 0.8 + 0.2;
        
        // Add this layer to accumulated color
        accumulatedColor += layerCoreColor * layerCore + layerBloomColor * layerBloom * 0.8;
    }
    
    // Normalize accumulation to prevent overbrightening
    accumulatedColor = accumulatedColor / float(numLayers) * 2.0;
    
    // Clamp
    accumulatedColor = min(accumulatedColor, 1.2);
    
    fragColor = vec4(accumulatedColor, 1.0);
}