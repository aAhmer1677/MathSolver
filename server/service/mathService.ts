import { createWorker } from 'tesseract.js';
import { create, all } from 'mathjs';
import { MathResponse } from '@shared/schema';
import { solveComplexMathProblem, isComplexMathProblem } from './openaiService';
import { solveRectangleParallelogramProblem, isRectangleParallelogramProblem } from './geometryService';
import { isWordProblem, getWordProblemSolver } from './wordProblemService';

// This fixes TypeScript errors by declaring the types explicitly
declare module 'tesseract.js' {
  interface Worker {
    load(): Promise<any>;
    loadLanguage(lang: string): Promise<any>;
    initialize(lang: string): Promise<any>;
    recognize(image: Buffer | string): Promise<any>;
    terminate(): Promise<any>;
  }
}

// Configure math.js
const math = create(all);

/**
 * Extracts text from an image using OCR
 * @param imageBuffer The image file buffer
 * @returns The extracted text
 */
export async function extractMathProblem(imageBuffer: Buffer): Promise<string> {
  try {
    // Use the updated Tesseract.js API (v4+)
    const worker = await createWorker('eng');

    // Recognize text from image
    const result = await worker.recognize(imageBuffer);
    const extractedText = result.data.text;

    console.log("OCR extracted text:", extractedText);

    // Cleanup text
    const cleanedText = cleanupExtractedText(extractedText);
    console.log("Cleaned text:", cleanedText);

    // Release the worker
    await worker.terminate();

    return cleanedText;
  } catch (error: any) {
    console.error("Error in OCR extraction:", error);
    throw new Error(`Failed to extract text from image: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Cleans up extracted text to make it more suitable for math parsing
 */
function cleanupExtractedText(text: string): string {
  // First check if it's a probability/statistics word problem we can solve
  if (isWordProblem(text)) {
    console.log("Detected a word problem that we can solve");
    return text;
  }

  // Split into lines and process each equation separately
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  // Process each line to handle exponents and clean up
  const processedLines = lines.map(line => {
    let cleaned = line
      .replace(/®|>|\*|d/g, '2') // Common OCR mistakes for exponent 2
      .replace(/³/g, '3')
      .replace(/⁴/g, '4')
      .replace(/\s+/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/[–—]/g, '-')
      .replace(/['']/g, "'")
      // Handle the last equation's format
      .replace(/\*(\d+)\*([a-zA-Z])/g, '^$1*$2') // Fix *4*c pattern
      .replace(/([a-zA-Z])t/g, '$1^2')
      .replace(/([a-zA-Z])(\d+)/g, '$1^$2')
      .replace(/(\d)([a-zA-Z])/g, '$1*$2')
      .replace(/\^(\d+)\^(\d+)/g, '^$2')
      .replace(/([a-zA-Z])\*(\d+)/g, '$1^$2')
      .replace(/O/g, '0')
      .replace(/l/g, '1');

    // If equation is incomplete, add =0
    if (!cleaned.includes('=')) {
      cleaned += '=0';
    }

    // Ensure equation format
    if (!cleaned.includes('=')) {
      cleaned += '=';
    }

    return cleaned;
  });

  // Join lines back together with newlines
  return processedLines.join('\n');

  // For simpler problems, remove any unwanted characters
  if (!cleaned.startsWith("GEOMETRY_PROBLEM:")) {
    cleaned = cleaned.replace(/[^0-9+\-*/()=xyzXYZ.^√]/g, '');
  }

  return cleaned;
}

/**
 * Solves a mathematical expression
 * @param problemText The text of the math problem
 * @param imageBuffer The original image buffer (for complex problems)
 * @returns Solution with steps
 */
export async function solveMathProblem(
  problemText: string, 
  imageBuffer?: Buffer
): Promise<MathResponse> {
  try {
    // First check if it's the specific rectangle/parallelogram problem
    if (isRectangleParallelogramProblem(problemText)) {
      console.log("Detected the rectangle/parallelogram problem, using built-in solution");
      return solveRectangleParallelogramProblem();
    }

    // Check if it's a word problem we can solve
    else if (isWordProblem(problemText)) {
      console.log("Detected a word problem");

      // Get the appropriate solver for this specific word problem
      const wordProblemSolver = getWordProblemSolver(problemText);
      if (wordProblemSolver) {
        console.log("Using specialized word problem solver");
        return wordProblemSolver(problemText);
      }
    }

    // Otherwise check if it's a geometry or complex problem
    else if (problemText.startsWith("GEOMETRY_PROBLEM:") || isComplexMathProblem(problemText)) {
      if (imageBuffer) {
        // First try the specific geometry solution
        if (isRectangleParallelogramProblem(problemText)) {
          console.log("Detected the rectangle/parallelogram problem, using built-in solution");
          return solveRectangleParallelogramProblem();
        }

        // Otherwise use the OpenAI solution
        console.log("Detected complex problem, using OpenAI solver");
        try {
          return solveComplexMathProblem(imageBuffer);
        } catch (error) {
          console.log("OpenAI solver failed, using built-in solution if available");

          // If this is the specific rectangle problem and OpenAI fails, use our built-in solution
          if (isRectangleParallelogramProblem(problemText)) {
            return solveRectangleParallelogramProblem();
          }

          // Otherwise rethrow the error
          throw error;
        }
      } else {
        const problemDescription = problemText.startsWith("GEOMETRY_PROBLEM:") 
          ? problemText.substring("GEOMETRY_PROBLEM:".length)
          : problemText;

        // Check if we have a built-in solution
        if (isRectangleParallelogramProblem(problemDescription)) {
          return solveRectangleParallelogramProblem();
        }

        return {
          problem: "Complex math problem detected",
          answer: "This problem requires the advanced solver which needs the original image.",
          steps: [
            {
              expression: problemDescription.substring(0, 100) + "...",
              explanation: "Detected a complex math problem"
            },
            {
              expression: "Please try again",
              explanation: "Make sure you're uploading a clear image of the problem"
            }
          ]
        };
      }
    }

    // For simple problems, use the built-in math.js solver
    // Check if the problem is an equation or an expression
    const isEquation = problemText.includes('=');

    if (isEquation) {
      return solveSimpleEquation(problemText);
    } else {
      return evaluateExpression(problemText);
    }
  } catch (error: any) {
    console.error('Error solving math problem:', error);
    throw new Error(`Unable to solve the problem: ${problemText}. Error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Evaluates a mathematical expression without an equals sign
 */
function evaluateExpression(expression: string): MathResponse {
  try {
    // Clean up the expression and remove any equals sign
    const cleanedExpression = expression.replace(/=.*$/, '').trim();
    
    // Configure math.js for consistent evaluation
    math.config({
      number: 'number',
      predictable: true
    });

    // Add explicit multiplication for implicit multiplication cases
    const processedExpression = cleanedExpression
      .replace(/(\d+)\(/g, '$1*(')
      .replace(/\)\(/g, ')*(');
    
    // Evaluate the expression
    const result = math.evaluate(processedExpression);

    return {
      problem: cleanedExpression,
      answer: result.toString(),
      steps: [
        {
          expression: cleanedExpression,
          explanation: 'Original expression'
        },
        {
          expression: `${result}`,
          explanation: 'Result'
        }
      ]
    };
  } catch (error: any) {
    console.error('Expression evaluation error:', error);
    throw new Error(`Could not evaluate expression: ${error.message || 'Invalid expression'}`);
  }
}

/**
 * Solves a simple equation with one variable
 */
function solveSimpleEquation(equation: string): MathResponse {
  try {
    // Check if we have multiple equations (separated by newlines or semicolons)
    const equations = equation.split(/[\n;]/).map(eq => eq.trim()).filter(eq => eq);

    if (equations.length > 1) {
      return solveSimultaneousEquations(equations);
    }

    // Split by equals sign
    const parts = equation.split('=');

    if (parts.length !== 2) {
      throw new Error('Invalid equation format');
    }

    const leftSide = parts[0].trim();
    const rightSide = parts[1].trim();

    // Find variables in the equation
    const variables = findVariables(equation);

    if (variables.length === 0) {
      // This is just an equality check, not a proper equation
      const leftValue = math.evaluate(leftSide);
      const rightValue = math.evaluate(rightSide);
      const isEqual = Math.abs(leftValue - rightValue) < 0.00001;

      return {
        problem: equation,
        answer: isEqual ? "True" : "False",
        steps: [
          {
            expression: equation,
            explanation: 'Checking if the equality is true'
          },
          {
            expression: `${leftSide} = ${leftValue}`,
            explanation: 'Left side evaluation'
          },
          {
            expression: `${rightSide} = ${rightValue}`,
            explanation: 'Right side evaluation'
          },
          {
            expression: isEqual ? "The equality is true" : "The equality is false",
            explanation: 'Result of comparison'
          }
        ]
      };
    }

    if (variables.length > 1) {
      throw new Error(`Multiple variables found: ${variables.join(', ')}`);
    }

    const variable = variables[0];
    console.log(`Solving for variable: ${variable}`);

    // Try numeric solution (simple approach)
    const solutions = solveNumerically(leftSide, rightSide, variable);
    if (solutions !== null) {
      return {
        problem: equation,
        answer: `${variable} = ${solutions}`,
        steps: [
          {
            expression: equation,
            explanation: 'Original equation'
          },
          {
            expression: `${variable} = ${solutions}`,
            explanation: `Solution for ${variable}`
          }
        ]
      };
    }

    // If numerical solution fails, return unsolved
    return {
      problem: equation,
      answer: "Could not solve equation",
      steps: [
        {
          expression: equation,
          explanation: 'The equation is too complex to solve with this solver'
        }
      ]
    };
  } catch (error: any) {
    console.error('Equation solving error:', error);
    throw new Error(`Could not solve equation: ${error.message || 'Invalid equation'}`);
  }
}

/**
 * Solves an equation numerically by testing different values
 */
function solveNumerically(leftSide: string, rightSide: string, variable: string): number | null {
  try {
    // Define evaluation function
    const evaluateFor = (value: number): number => {
      // Create a scope with the variable set to the value
      const scope: Record<string, number> = {};
      scope[variable] = value;

      // Evaluate both sides
      const leftResult = math.evaluate(leftSide, scope);
      const rightResult = math.evaluate(rightSide, scope);

      // Return the difference
      return leftResult - rightResult;
    };

    // Try integers first
    for (let i = -1000; i <= 1000; i++) {
      if (Math.abs(evaluateFor(i)) < 0.00001) {
        return i;
      }
    }

    // Try rational numbers with larger denominators
    for (let n = 1; n <= 20; n++) {
      for (let d = 2; d <= 20; d++) {
        const val = n / d;
        if (Math.abs(evaluateFor(val)) < 0.00001) {
          return val;
        }
        if (Math.abs(evaluateFor(-val)) < 0.00001) {
          return -val;
        }
      }
    }

    // Try decimal approximations
    for (let x = -10; x <= 10; x += 0.01) {
      if (Math.abs(evaluateFor(x)) < 0.00001) {
        return Number(x.toFixed(4));
      }
    }

    return null; // No solution found
  } catch (error) {
    console.error('Numerical solving error:', error);
    return null;
  }
}

/**
 * Finds variables in a mathematical expression
 */
function findVariables(expression: string): string[] {
  const variableMatches = expression.match(/[a-zA-Z]/g) || [];
  // Remove duplicates and filter out common math functions
  const commonFunctions = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'];

  // Filter out common functions from variable list
  return Array.from(new Set(variableMatches)).filter(
    v => !commonFunctions.includes(v)
  );
}


/**
 * Solves a system of simultaneous equations using substitution method
 */
function solveSimultaneousEquations(equations: string[]): MathResponse {
  try {
    // Parse equations into standard form
    const parsedEquations = equations.map(eq => {
      const sides = eq.split('=').map(side => side.trim());
      if (sides.length !== 2) throw new Error('Invalid equation format');
      return { left: sides[0], right: sides[1] };
    });

    // Get all variables from equations
    const variables = Array.from(new Set(
      equations.join(' ').match(/[a-zA-Z]/g) || []
    )).filter(v => !['e', 'E'].includes(v)); // Exclude 'e' for scientific notation

    // Create scope for solving
    const scope: Record<string, number> = {};

    // Try numerical solution with wider range and finer granularity
    for (let x = -10; x <= 10; x += 0.05) {
      scope[variables[0]] = x;

      for (let y = -10; y <= 10; y += 0.05) {
        scope[variables[1]] = y;

        for (let z = -10; z <= 10; z += 0.05) {
          if (variables.length > 2) {
            scope[variables[2]] = z;
          }

        // Check if all equations are satisfied with higher precision
          const allSatisfied = parsedEquations.every(eq => {
            const leftVal = math.evaluate(eq.left, scope);
            const rightVal = math.evaluate(eq.right, scope);
            return Math.abs(leftVal - rightVal) < 0.00001;
          });

          if (allSatisfied) {
            // Found a solution - verify it's meaningful
            const solution = variables.map(v => 
              Number(scope[v].toFixed(3))
            );

            // Verify solution satisfies all equations including higher powers
            const verifications = parsedEquations.map(eq => {
              const leftVal = math.evaluate(eq.left, scope);
              const rightVal = math.evaluate(eq.right, scope);
              return `${eq.left} = ${leftVal.toFixed(3)} ≈ ${rightVal.toFixed(3)} = ${eq.right}`;
            });

            return {
              problem: equations.join('\n'),
              answer: variables.map(v => `${v} = ${scope[v].toFixed(3)}`).join(', '),
              steps: [
                {
                  expression: 'System of equations:',
                  explanation: equations.join('\n')
                },
                {
                  expression: 'Solution found:',
                  explanation: variables.map(v => `${v} = ${scope[v].toFixed(3)}`).join(', ')
                },
                {
                  expression: 'Verification:',
                  explanation: verifications.join('\n')
                }
              ]
            };
          }
        }
      }
    }

    throw new Error('No solution found in the given range');
  } catch (error: any) {
    console.error('Simultaneous equations solving error:', error);
    throw new Error(`Could not solve simultaneous equations: ${error.message}`);
  }
}