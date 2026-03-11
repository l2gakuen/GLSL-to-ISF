#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const convertShader = require('./converters/shadertoy-to-isf');

program
  .version('1.0.0')
  .description('Convert Shadertoy shaders to ISF format')
  .argument('<input>', 'Input Shadertoy shader file or URL')
  .option('-o, --output <file>', 'Output ISF file')
  .option('-j, --json-only', 'Generate only the JSON descriptor')
  .option('--pretty', 'Pretty print JSON output')
  .option('--watch', 'Watch file for changes and auto-convert')
  .option('--validate', 'Validate the converted shader')
  .parse(process.argv);

const options = program.opts();
const inputFile = program.args[0];

function validateISF(shaderCode) {
  const errors = [];
  
  // Check JSON format
  const jsonMatch = shaderCode.match(/\/\*([\s\S]*?)\*\//);
  if (!jsonMatch) {
    errors.push('Missing JSON descriptor');
  } else {
    try {
      JSON.parse(jsonMatch[1]);
    } catch (e) {
      errors.push(`Invalid JSON: ${e.message}`);
    }
  }

  // Check for required elements
  if (!shaderCode.includes('void main()')) {
    errors.push('Missing main() function');
  }
  
  if (!shaderCode.includes('gl_FragColor')) {
    errors.push('Missing gl_FragColor assignment');
  }

  // Check for common mistakes
  if (shaderCode.includes('fragCoord')) {
    errors.push('Use gl_FragCoord instead of fragCoord');
  }
  
  if (shaderCode.includes('fragColor')) {
    errors.push('Use gl_FragColor instead of fragColor');
  }

  return errors;
}

async function main() {
  try {
    console.log(chalk.blue('🔄 Shadertoy to ISF Converter v2 (Fixed)'));
    console.log(chalk.gray('────────────────────────────────────'));

    // Read input file
    let shaderCode;
    if (inputFile.startsWith('http')) {
      console.log(chalk.yellow(`📡 Fetching from URL: ${inputFile}`));
      const response = await fetch(inputFile);
      shaderCode = await response.text();
    } else {
      console.log(chalk.yellow(`📄 Reading file: ${inputFile}`));
      shaderCode = fs.readFileSync(inputFile, 'utf8');
    }

    // Convert the shader
    console.log(chalk.yellow('🔄 Converting shader...'));
    const result = convertShader(shaderCode, {
      jsonOnly: options.jsonOnly,
      pretty: options.pretty
    });

    // Validate if requested
    if (options.validate) {
      const errors = validateISF(result);
      if (errors.length > 0) {
        console.log(chalk.red('\n❌ Validation errors:'));
        errors.forEach(err => console.log(chalk.red(`  • ${err}`)));
      } else {
        console.log(chalk.green('\n✅ Validation passed!'));
      }
    }

    // Determine output path
    let outputPath = options.output;
    if (!outputPath) {
      const baseName = path.basename(inputFile, path.extname(inputFile));
      outputPath = `${baseName}.isf.fs`;
    }

    // Write output
    fs.writeFileSync(outputPath, result);
    console.log(chalk.green(`\n✅ Conversion complete! Saved to: ${outputPath}`));

    // Show preview
    console.log(chalk.gray('\n📋 Preview (first 5 lines):'));
    result.split('\n').slice(0, 5).forEach(line => {
      console.log(chalk.gray(`  ${line}`));
    });

    // Watch mode
    if (options.watch && !inputFile.startsWith('http')) {
      console.log(chalk.blue('\n👀 Watching for changes... (Ctrl+C to stop)'));
      fs.watch(inputFile, (eventType) => {
        if (eventType === 'change') {
          console.log(chalk.yellow('\n📝 File changed, reconverting...'));
          const newCode = fs.readFileSync(inputFile, 'utf8');
          const newResult = convertShader(newCode, options);
          fs.writeFileSync(outputPath, newResult);
          console.log(chalk.green(`✅ Updated: ${outputPath}`));
          
          if (options.validate) {
            const errors = validateISF(newResult);
            if (errors.length > 0) {
              console.log(chalk.red('❌ Validation errors:'));
              errors.forEach(err => console.log(chalk.red(`  • ${err}`)));
            } else {
              console.log(chalk.green('✅ Validation passed!'));
            }
          }
        }
      });
    }

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

main();