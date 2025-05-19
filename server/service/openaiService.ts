import OpenAI from 'openai';
import { MathResponse } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory (ES modules version of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client with better configuration
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OpenAI API Key not found in environment variables');
  throw new Error('OpenAI API Key is required');
}

const openai = new OpenAI({
  apiKey,
  maxRetries: 3,
  timeout: 30000,
});

// Rate limiting setup
const REQUESTS_PER_MINUTE = 20;
let requestsThisMinute = 0;
let lastResetTime = Date.now();

function checkRateLimit() {
  const now = Date.now();
  if (now - lastResetTime >= 60000) {
    requestsThisMinute = 0;
    lastResetTime = now;
  }
  
  if (requestsThisMinute >= REQUESTS_PER_MINUTE) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  requestsThisMinute++;
}

// Set a monthly quota to control costs
const MONTHLY_QUOTA = 20; // 20 requests per month
let usageCount = 0;

// Create a tracker file to persist usage between restarts
const USAGE_FILE = path.join(__dirname, '../../usage_tracker.json');

// Load existing usage
try {
  if (fs.existsSync(USAGE_FILE)) {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    usageCount = data.count || 0;
    
    // Reset count if it's a new month
    const lastUpdated = new Date(data.lastUpdated);
    const currentDate = new Date();
    if (lastUpdated.getMonth() !== currentDate.getMonth() || 
        lastUpdated.getFullYear() !== currentDate.getFullYear()) {
      usageCount = 0;
    }
  }
} catch (error) {
  console.error('Error loading usage data:', error);
  usageCount = 0;
}

// Function to update usage
function updateUsage() {
  usageCount++;
  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify({
      count: usageCount,
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error saving usage data:', error);
  }
}

/**
 * Solves complex math problems using OpenAI's GPT-4 Vision model
 * @param imageBuffer The image containing the math problem
 * @returns Solution with steps and diagram description
 */
export async function solveComplexMathProblem(imageBuffer: Buffer): Promise<MathResponse> {
  // Check usage quota
  if (usageCount >= MONTHLY_QUOTA) {
    return {
      problem: "Monthly quota exceeded",
      answer: "You have reached the monthly limit for complex problem solving. Try again next month or use the basic solver.",
      steps: [
        {
          expression: "Quota exceeded",
          explanation: "Due to API costs, we limit complex problem solving to 20 per month."
        }
      ]
    };
  }
  
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Check rate limit before making API call
    checkRateLimit();
    
    // Call OpenAI API with improved prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `You are a mathematics expert specializing in solving complex mathematical problems.
                   Analyze the problem carefully and provide a detailed, step-by-step solution.
                   Format your response clearly with:
                   1. Problem statement
                   2. Step-by-step solution with clear explanations
                   3. Final answer in a concise form
                   Be precise and mathematical in your explanations.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Solve this math problem and explain your solution step by step. Include descriptions of any diagrams."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
    });
    
    // Update usage count
    updateUsage();
    
    // Process and format the response
    const aiResponse = response.choices[0].message.content || "";
    
    // Parse the response into our format
    const steps: { expression: string; explanation: string }[] = [];
    const lines = aiResponse.split('\n');
    let problem = "";
    let answer = "";
    
    // Extract problem, steps, and answer from response
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Find problem statement
      if (line.startsWith("Problem:") || line.includes("problem asks") || line.includes("given ")) {
        problem = line;
      }
      
      // Find answer
      if (line.includes("Therefore,") || line.includes("Thus,") || line.includes("The answer is") || 
          line.includes("final answer") || line.includes("solution is")) {
        answer = line;
      }
      
      // Build steps
      if (line && !line.startsWith('#')) {
        const explanation = lines[i + 1] ? lines[i + 1].trim() : "";
        steps.push({
          expression: line,
          explanation: explanation
        });
        
        // Skip the explanation line since we've already used it
        if (explanation) i++;
      }
    }
    
    // If we didn't find a clear problem statement, use the first sentence
    if (!problem && lines.length > 0) {
      problem = lines[0];
    }
    
    // If we didn't find a clear answer, use the last sentence
    if (!answer && lines.length > 0) {
      answer = lines[lines.length - 1];
    }
    
    return {
      problem,
      answer,
      steps: steps.length > 0 ? steps : [{ expression: "See full solution below", explanation: aiResponse }]
    };
  } catch (error) {
    console.error('Error solving complex math problem with OpenAI:', error);
    
    // Provide a helpful error message
    return {
      problem: "Error processing complex problem",
      answer: "There was an error processing your complex math problem. Please try again later.",
      steps: [
        {
          expression: "API Error",
          explanation: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ]
    };
  }
}

/**
 * Checks if an image contains a complex math problem
 * @param text The extracted text from OCR
 * @returns True if it's likely a complex problem
 */
export function isComplexMathProblem(text: string): boolean {
  // Look for indicators of a complex problem
  return text.length > 100 || 
         text.toLowerCase().includes('rectangle') || 
         text.toLowerCase().includes('triangle') ||
         text.toLowerCase().includes('circle') ||
         text.toLowerCase().includes('diagram') ||
         text.toLowerCase().includes('figure') ||
         text.toLowerCase().includes('parallelogram') ||
         text.toLowerCase().includes('perpendicular') ||
         text.toLowerCase().includes('segment') ||
         text.toLowerCase().includes('prove') ||
         text.toLowerCase().includes('find the value') ||
         text.split('\n').length > 4;
}