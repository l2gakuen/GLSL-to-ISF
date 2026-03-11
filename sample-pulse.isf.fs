/*{
    "CATEGORIES": [
        "Generator"
    ],
    "CREDIT": "Converted from Shadertoy",
    "DESCRIPTION": "Pulsating Dot Grid with Bloom Effect",
    "INPUTS": [
        {
            "DEFAULT": 12,
            "LABEL": "Grid Size",
            "MAX": 30,
            "MIN": 2,
            "NAME": "gridSize",
            "TYPE": "float"
        },
        {
            "DEFAULT": [
                1,
                1,
                1,
                1
            ],
            "LABEL": "Core Color",
            "NAME": "coreColor",
            "TYPE": "color"
        },
        {
            "DEFAULT": [
                1,
                0.9,
                0.7,
                1
            ],
            "LABEL": "Bloom Color",
            "NAME": "bloomColor",
            "TYPE": "color"
        },
        {
            "DEFAULT": 1.5,
            "LABEL": "Bloom Intensity",
            "MAX": 5,
            "MIN": 0,
            "NAME": "bloomIntensity",
            "TYPE": "float"
        },
        {
            "DEFAULT": 2,
            "LABEL": "Bloom Radius",
            "MAX": 5,
            "MIN": 0.5,
            "NAME": "bloomRadius",
            "TYPE": "float"
        },
        {
            "DEFAULT": 1.2,
            "LABEL": "Bloom Falloff",
            "MAX": 3,
            "MIN": 0.5,
            "NAME": "bloomFalloff",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.5,
            "LABEL": "Bloom Pulse Amount",
            "MAX": 1,
            "MIN": 0,
            "NAME": "bloomPulse",
            "TYPE": "float"
        },
        {
            "DEFAULT": 1,
            "LABEL": "Pulse Speed",
            "MAX": 5,
            "MIN": 0,
            "NAME": "pulseSpeed",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0,
            "LABEL": "Min Dot Size",
            "MAX": 0.45,
            "MIN": 0,
            "NAME": "minDotSize",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.35,
            "LABEL": "Max Dot Size",
            "MAX": 0.45,
            "MIN": 0.1,
            "NAME": "maxDotSize",
            "TYPE": "float"
        }
    ],
    "ISFVSN": "2",
    "VSN": ""
}
*/

void main() {
    // Get normalized coordinates (0-1)
    vec2 uv = isf_FragNormCoord.xy;
    
    // Fix aspect ratio to keep dots square
    uv.x *= RENDERSIZE.x / RENDERSIZE.y;
    
    // Grid parameters
    float gSize = gridSize;
    
    // Bloom accumulators
    float totalBloom = 0.0;
    float totalCore = 0.0;
    
    // Sample a 3x3 neighborhood of cells for bloom effect
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
            
            // Unique time offset for this cell (based on grid position)
            float timeOffset = dot(cell, vec2(1.2, 3.7)) * 2.0;
            float pulse = 0.5 + 0.5 * sin(TIME * pulseSpeed + timeOffset);
            
            // Dot size pulses between min and max
            float dotSize = minDotSize + (maxDotSize - minDotSize) * pulse;
            
            // Core dot (sharp) - only from the center cell
            if (i == 0 && j == 0) {
                float core = 1.0 - smoothstep(dotSize - 0.03, dotSize + 0.03, dist);
                totalCore = core;
            }
            
            // Bloom contribution from this cell
            float bloomPulseFactor = 1.0 - bloomPulse + bloomPulse * pulse;
            
            // Calculate distance for bloom (to this cell's center)
            vec2 cellCenter = (cell + 0.5) / gSize - uv;
            float bloomDist = length(cellCenter * gSize);
            
            // Scale bloom with dot size (no bloom when dot is invisible)
            float dotSizeFactor = maxDotSize > 0.0 ? dotSize / maxDotSize : 0.0;
            
            // Scale radius and intensity with dot size
            float scaledBloomRadius = bloomRadius * (0.5 + 1.5 * dotSizeFactor);
            float intensityScale = dotSizeFactor * (0.8 + 0.4 * pulse);
            
            // Calculate bloom using exponential falloff
            float bloom = exp(-pow(bloomDist * scaledBloomRadius, bloomFalloff)) 
                        * bloomIntensity 
                        * bloomPulseFactor 
                        * intensityScale;
            
            totalBloom += bloom;
        }
    }
    
    // Combine core and bloom
    float dot = max(totalCore, totalBloom);
    dot = min(dot, 1.2); // Allow slight overbright for glow effect
    
    // Apply colors
    vec3 finalColor = coreColor.rgb * totalCore + bloomColor.rgb * totalBloom * 0.8;
    
    gl_FragColor = vec4(finalColor, 1.0);
}