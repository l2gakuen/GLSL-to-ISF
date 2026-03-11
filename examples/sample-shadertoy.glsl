// Name: Simple Gradient Shader
// Author: Example Author
// Description: A simple moving gradient

uniform float uSpeed;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform sampler2D iChannel0;

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord / iResolution.xy;
    
    // Time varying pixel color
    float t = iTime * uSpeed;
    vec3 col = mix(uColor1, uColor2, uv.x + sin(uv.y * 10.0 + t) * 0.1);
    
    // Sample input texture
    vec4 texColor = texture2D(iChannel0, uv);
    col = mix(col, texColor.rgb, 0.5);
    
    // Output to screen
    fragColor = vec4(col, 1.0);
}