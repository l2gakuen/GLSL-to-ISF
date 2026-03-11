const fs = require('fs');
const path = require('path');

function validateISF(shaderCode) {
  // Basic validation
  const hasJSON = shaderCode.match(/\/\*![\s\S]*?\*\//);
  if (!hasJSON) {
    return { valid: false, error: 'Missing JSON descriptor' };
  }

  const hasMain = shaderCode.includes('void main()');
  if (!hasMain) {
    return { valid: false, error: 'Missing main() function' };
  }

  const hasGlFragColor = shaderCode.includes('gl_FragColor');
  if (!hasGlFragColor) {
    return { valid: false, error: 'Missing gl_FragColor assignment' };
  }

  return { valid: true };
}

function batchConvert(inputDir, outputDir, options = {}) {
  const files = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.glsl') || f.endsWith('.frag'));

  const results = {
    success: [],
    failed: []
  };

  files.forEach(file => {
    try {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file.replace(/\.(glsl|frag)$/, '.isf.fs'));
      
      const shaderCode = fs.readFileSync(inputPath, 'utf8');
      const convertShader = require('./shadertoy-to-isf');
      const converted = convertShader(shaderCode, options);
      
      fs.writeFileSync(outputPath, converted);
      results.success.push(file);
    } catch (error) {
      results.failed.push({ file, error: error.message });
    }
  });

  return results;
}

module.exports = {
  validateISF,
  batchConvert
};