/**
 * Shadertoy to ISF Converter Core - FIXED VERSION
 */

function extractMetadata(shaderCode) {
  const metadata = {
    name: 'Converted Shadertoy Shader',
    description: '',
    credit: 'Converted from Shadertoy',
    categories: ['Generator'],
    inputs: []
  };

  // Try to extract shader name from comments
  const nameMatch = shaderCode.match(/\/\/\s*Name:\s*(.+)/i) || 
                    shaderCode.match(/\/\*\*\s*([^*]+)\*\//) ||
                    shaderCode.match(/\/\/\s*(.+?)(?:\n|$)/);
  if (nameMatch) {
    metadata.name = nameMatch[1].trim();
  }

  // Extract description
  const descMatch = shaderCode.match(/\/\/\s*Description:\s*(.+)/i) ||
                    shaderCode.match(/\/\/\s*Desc:\s*(.+)/i);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }

  // Extract author/credit
  const authorMatch = shaderCode.match(/\/\/\s*Author:\s*(.+)/i) ||
                      shaderCode.match(/\/\/\s*By:\s*(.+)/i) ||
                      shaderCode.match(/\/\/\s*Credit:\s*(.+)/i);
  if (authorMatch) {
    metadata.credit = authorMatch[1].trim();
  }

  return metadata;
}

function findUniforms(shaderCode) {
  const uniforms = [];
  
  // Regular expressions for different uniform types
  const uniformPatterns = [
    { type: 'float', regex: /uniform\s+float\s+(\w+)\s*;/g },
    { type: 'vec2', regex: /uniform\s+vec2\s+(\w+)\s*;/g },
    { type: 'vec3', regex: /uniform\s+vec3\s+(\w+)\s*;/g },
    { type: 'vec4', regex: /uniform\s+vec4\s+(\w+)\s*;/g },
    { type: 'color', regex: /uniform\s+vec4\s+(\w+)\s*;?\s*\/\/\s*color/i },
    { type: 'image', regex: /uniform\s+sampler2D\s+(\w+)\s*;/g },
    { type: 'int', regex: /uniform\s+int\s+(\w+)\s*;/g },
    { type: 'bool', regex: /uniform\s+bool\s+(\w+)\s*;/g }
  ];

  uniformPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(shaderCode)) !== null) {
      // Skip common Shadertoy uniforms
      if (['iResolution', 'iTime', 'iTimeDelta', 'iFrame', 
           'iChannelTime', 'iChannelResolution', 'iMouse', 
           'iDate', 'iSampleRate'].includes(match[1])) {
        continue;
      }
      
      uniforms.push({
        name: match[1],
        type: pattern.type,
        label: match[1].replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      });
    }
  });

  return uniforms;
}

function findChannels(shaderCode) {
  const channels = [];
  const channelRegex = /iChannel(\d+)/g;
  let match;
  const channelSet = new Set();

  while ((match = channelRegex.exec(shaderCode)) !== null) {
    channelSet.add(match[0]);
  }

  channelSet.forEach(channel => {
    const index = channel.match(/\d+/)[0];
    channels.push({
      name: channel,
      index: parseInt(index),
      label: `Channel ${index}`
    });
  });

  return channels.sort((a, b) => a.index - b.index);
}

function convertShaderCode(code, uniforms, channels) {
  let converted = code;

  // Replace mainImage with main
  converted = converted.replace(
    /void\s+mainImage\s*\(\s*out\s+vec4\s+\w+\s*,\s*in\s+vec2\s+\w+\s*\)/,
    'void main()'
  );

  // Replace texture lookups
  converted = converted.replace(/texture2D\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 
    (match, sampler, coords) => {
      // Check if using normalized coordinates
      if (coords.includes('fragCoord') || coords.includes('gl_FragCoord')) {
        return `IMG_PIXEL(${sampler}, ${coords})`;
      }
      return `IMG_NORM_PIXEL(${sampler}, ${coords})`;
    });

  // Replace texture lookups with iChannel
  converted = converted.replace(/texture2D\s*\(\s*iChannel(\d+)\s*,\s*([^)]+)\s*\)/g,
    (match, channelNum, coords) => {
      return `IMG_NORM_PIXEL(inputImage${channelNum}, ${coords})`;
    });

  // Replace Shadertoy uniforms with ISF equivalents
  const uniformMap = {
    'iResolution': 'RENDERSIZE',
    'iTime': 'TIME',
    'iTimeDelta': 'TIMEDELTA',
    'iFrame': 'FRAMEINDEX',
    'iDate': 'DATE',
    'iMouse': 'MOUSE',
    'iChannelResolution': 'inputImage_SIZE'
  };

  Object.entries(uniformMap).forEach(([stoy, isf]) => {
    const regex = new RegExp(`\\b${stoy}\\b`, 'g');
    converted = converted.replace(regex, isf);
  });

  // Fix coordinate handling - THIS IS CRITICAL
  // Replace fragCoord with gl_FragCoord
  converted = converted.replace(/\bfragCoord\b/g, 'gl_FragCoord');
  
  // Add normalized coordinate helper for common patterns
  converted = converted.replace(
    /vec2\s+(\w+)\s*=\s*gl_FragCoord\.xy\s*\/\s*RENDERSIZE\.xy/g,
    'vec2 $1 = isf_FragNormCoord.xy'
  );
  
  // Also handle cases where resolution is iResolution (already replaced) or RENDERSIZE
  converted = converted.replace(
    /vec2\s+(\w+)\s*=\s*gl_FragCoord\.xy\s*\/\s*([^;]+);/g,
    (match, varName, resolution) => {
      if (resolution.includes('RENDERSIZE')) {
        return `vec2 ${varName} = isf_FragNormCoord.xy;`;
      }
      return match;
    }
  );

  // Remove Shadertoy-specific defines and uniforms
  converted = converted.replace(/#define\s+(MAIN|iChannel).*\n/g, '');
  
  // Remove uniform declarations (they'll be in JSON)
  const uniformDeclRegex = /uniform\s+(float|vec[234]|int|bool|sampler2D|samplerCube)\s+\w+\s*;\s*\n?/g;
  converted = converted.replace(uniformDeclRegex, '');
  
  // Remove Shadertoy uniform declarations
  const stoyUniforms = ['iResolution', 'iTime', 'iTimeDelta', 'iFrame', 
                        'iChannelTime', 'iChannelResolution', 'iMouse', 
                        'iDate', 'iSampleRate'];
  stoyUniforms.forEach(uniform => {
    const regex = new RegExp(`uniform\\s+\\w+\\s+${uniform}\\s*;\\s*\\n?`, 'g');
    converted = converted.replace(regex, '');
  });

  // Fix fragColor to gl_FragColor
  converted = converted.replace(/\bfragColor\b/g, 'gl_FragColor');

  // Ensure alpha channel is set to 1.0 if not specified
  if (!converted.includes('gl_FragColor.a =') && 
      !converted.match(/gl_FragColor\s*=\s*vec4\([^,]+,[^,]+,[^,]+,\s*1\.0\)/) &&
      !converted.match(/gl_FragColor\s*=\s*vec4\([^,]+,\s*1\.0\)/)) {
    
    // Find the last gl_FragColor assignment
    const lastColorAssign = converted.lastIndexOf('gl_FragColor');
    if (lastColorAssign > 0) {
      // Add alpha=1.0 after the assignment
      converted = converted.replace(
        /(gl_FragColor\s*=\s*[^;]+);/,
        '$1; gl_FragColor.a = 1.0;'
      );
    }
  }

  return converted;
}

function generateJSON(metadata, uniforms, channels, options = {}) {
  // Clean metadata
  const description = metadata.description || metadata.name || 'Converted Shadertoy Shader';
  const credit = metadata.credit || 'Converted from Shadertoy';
  
  const json = {
    DESCRIPTION: description,
    CREDIT: credit,
    ISFVSN: "2",
    CATEGORIES: metadata.categories.length ? metadata.categories : ["Generator"],
    INPUTS: []
  };

  // Add channel inputs
  channels.forEach(channel => {
    json.INPUTS.push({
      NAME: `inputImage${channel.index}`,
      TYPE: "image",
      LABEL: channel.label
    });
  });

  // Add uniform inputs
  uniforms.forEach(uniform => {
    const input = {
      NAME: uniform.name,
      LABEL: uniform.label,
      TYPE: uniform.type
    };

    // Add defaults based on type
    switch (uniform.type) {
      case 'float':
        input.DEFAULT = 0.5;
        input.MIN = 0.0;
        input.MAX = 1.0;
        break;
      case 'int':
        input.DEFAULT = 0;
        input.MIN = 0;
        input.MAX = 100;
        break;
      case 'bool':
        input.DEFAULT = false;
        break;
      case 'color':
        input.DEFAULT = [1.0, 1.0, 1.0, 1.0];
        break;
      case 'vec2':
        input.DEFAULT = [0.5, 0.5];
        break;
      case 'vec3':
        input.DEFAULT = [0.5, 0.5, 0.5];
        break;
      case 'vec4':
        input.DEFAULT = [0.5, 0.5, 0.5, 1.0];
        break;
    }

    json.INPUTS.push(input);
  });

  // If no inputs, ensure INPUTS is an empty array
  if (json.INPUTS.length === 0) {
    json.INPUTS = [];
  }

  // Format JSON - IMPORTANT: No extra characters before the opening brace
  const spaces = options.pretty ? 2 : 0;
  return JSON.stringify(json, null, spaces);
}

function convertShader(shaderCode, options = {}) {
  // Extract metadata
  const metadata = extractMetadata(shaderCode);
  
  // Find uniforms and channels
  const uniforms = findUniforms(shaderCode);
  const channels = findChannels(shaderCode);
  
  // Generate JSON first (clean, no extra characters)
  const jsonStr = generateJSON(metadata, uniforms, channels, options);
  
  // Convert shader code
  let convertedCode = convertShaderCode(shaderCode, uniforms, channels);
  
  // Clean up any remaining issues
  convertedCode = convertedCode
    // Remove multiple blank lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Ensure proper spacing
    .trim();

  // Combine JSON and shader code - CRITICAL: Use /*{ not /*!{
  if (options.jsonOnly) {
    return jsonStr;
  }

  return `/*${jsonStr}*/\n\n${convertedCode}`;
}

module.exports = convertShader;