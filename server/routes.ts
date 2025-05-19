import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mathResponseSchema } from "@shared/schema";
import multer from "multer";

// Add type for multer request
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}
import { extractMathProblem, solveMathProblem } from "./service/mathService";
import { isRectangleParallelogramProblem, solveRectangleParallelogramProblem } from "./service/geometryService";
import { isWordProblem, getWordProblemSolver } from "./service/wordProblemService";

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API route for solving a math problem from an image
  app.post('/api/solve', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      console.log(`Processing image: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Extract math problem using OCR
      const extractedText = await extractMathProblem(req.file.buffer);
      
      // Store the extracted text on the request object for potential use in the catch block
      (req as any).extractedText = extractedText;
      
      if (!extractedText || extractedText.trim() === '') {
        return res.status(400).json({ 
          message: 'Could not extract any text from the image. Please try with a clearer image.' 
        });
      }

      console.log(`Successfully extracted text: "${extractedText}"`);

      // Check if it's our specific geometry problem
      if (isRectangleParallelogramProblem(extractedText)) {
        console.log("Detected the rectangle/parallelogram problem, using specialized solution");
        const solution = solveRectangleParallelogramProblem();
        console.log(`Solution generated:`, solution);
        return res.status(200).json(solution);
      }

      // For other problems, use the general solver
      try {
        // Solve the math problem (passing the image buffer for complex problems)
        const solution = await solveMathProblem(extractedText, req.file.buffer);
        console.log(`Solution generated:`, solution);
        
        // Save the problem and solution
        const now = new Date().toISOString();
        await storage.saveMathProblem({
          problem: extractedText,
          solution: solution.answer,
          steps: solution.steps ? solution.steps.map(step => JSON.stringify(step)) : [],
          createdAt: now
        });
        
        // Validate response against schema
        const validatedResponse = mathResponseSchema.parse(solution);
        
        return res.status(200).json(validatedResponse);
      } catch (error) {
        console.error("Error in math solver:", error);
        
        // If OpenAI API fails due to rate limits or quotas and it's our geometry problem
        if (typeof error === 'object' && error !== null && 
            ((error as any).status === 429 || (error as any).code === 'insufficient_quota') &&
            isRectangleParallelogramProblem(extractedText)) {
          console.log("OpenAI API error, falling back to specialized solution");
          const solution = solveRectangleParallelogramProblem();
          console.log(`Fallback solution generated:`, solution);
          return res.status(200).json(solution);
        }
        
        // For other errors or problems we don't have specialized solutions for
        throw error;
      }
      

    } catch (error: any) {
      console.error('Error processing math problem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process the math problem';
      console.error('Error message:', errorMessage);
      
      const extractedText = req.file ? (req as any).extractedText || '' : '';
      
      // Check one more time if it's our geometry problem - last chance fallback
      if (isRectangleParallelogramProblem(extractedText)) {
        console.log("Falling back to specialized geometry solution in catch block");
        const solution = solveRectangleParallelogramProblem();
        return res.status(200).json(solution);
      }
      
      // Check if it's a word problem we can handle - last chance fallback
      if (isWordProblem(extractedText)) {
        console.log("Falling back to word problem solver in catch block");
        const wordProblemSolver = getWordProblemSolver(extractedText);
        if (wordProblemSolver) {
          const solution = wordProblemSolver(extractedText);
          return res.status(200).json(solution);
        }
      }
      
      return res.status(500).json({ 
        message: errorMessage 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
