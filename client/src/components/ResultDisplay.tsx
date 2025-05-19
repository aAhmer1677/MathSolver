import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Check, AlertTriangle, Image, PencilRuler } from "lucide-react";
import { MathResponse } from "@shared/schema";
import { Separator } from "@/components/ui/separator";

interface ResultDisplayProps {
  result: MathResponse;
  onSolveNew: () => void;
}

export default function ResultDisplay({ result, onSolveNew }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyResult = () => {
    navigator.clipboard.writeText(result.answer)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Check if this is a complex problem
  const isUnsupportedProblem = (result.problem === "Complex geometry problem detected" || 
                               result.answer.includes("currently supports algebraic expressions")) &&
                               !result.problem.includes("rectangle") && 
                               !result.problem.includes("parallelogram");
  
  // Determine the problem type and styling
  const getProblemType = (): { type: string; color: string; icon: any } => {
    const problemText = result.problem.toLowerCase();
    
    if (result.problem.includes("Error processing") || isUnsupportedProblem) {
      return { type: 'Unsupported', color: 'text-amber-500', icon: AlertTriangle };
    }
    
    if (problemText.includes('rectangle') && problemText.includes('parallelogram')) {
      return { type: 'Geometry', color: 'text-purple-500', icon: PencilRuler };
    }
    
    if (problemText.includes('probability') || problemText.includes('die') || problemText.includes('dice')) {
      return { type: 'Probability', color: 'text-blue-500', icon: PencilRuler };
    }
    
    if (problemText.includes('derivative') || problemText.includes('integral')) {
      return { type: 'Calculus', color: 'text-indigo-600', icon: PencilRuler };
    }
    
    if (problemText.includes('sine') || problemText.includes('cosine') || problemText.includes('angle')) {
      return { type: 'Trigonometry', color: 'text-pink-500', icon: PencilRuler };
    }
    
    if (problemText.includes('mean') || problemText.includes('median') || problemText.includes('mode')) {
      return { type: 'Statistics', color: 'text-teal-500', icon: PencilRuler };
    }
    
    if (problemText.includes('solve') || problemText.includes('variable') || problemText.includes('equation')) {
      return { type: 'Algebra', color: 'text-amber-500', icon: PencilRuler };
    }
    
    return { type: 'Mathematics', color: 'text-green-500', icon: CheckCircle };
  };
  
  const { type, color, icon: Icon } = getProblemType();
  
  // Determine if this is a complex problem solved by the advanced solver
  const isComplexProblem = result.problem.includes("rectangle") || 
                          result.problem.includes("parallelogram") ||
                          result.problem.includes("triangle") ||
                          result.problem.includes("diagram") ||
                          result.problem.length > 60 ||
                          type !== 'Mathematics';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center">
            <Icon className={`h-5 w-5 ${color} mr-2`} />
            {isUnsupportedProblem ? "Unsupported Problem Type" : "Solution"}
          </h2>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${color.replace('text-', 'bg-').replace('500', '100')} ${color}`}>
            {type}
          </div>
        </div>
        
        {/* Extracted Problem */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            {isComplexProblem ? "Problem Description" : "Extracted Problem"}
          </h3>
          <div className={`p-4 bg-gray-50 rounded-lg ${isComplexProblem ? 'font-normal' : 'font-mono'} text-gray-800`}>
            {result.problem}
          </div>
        </div>
        
        {/* Solution */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            {isUnsupportedProblem ? "Message" : isComplexProblem ? "Detailed Solution" : "Solution"}
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            {/* Solution Steps */}
            {result.steps && result.steps.length > 0 && (
              <div className="space-y-4">
                {result.steps.map((step, index) => (
                  <div key={index} className="step">
                    <p className={`text-gray-700 mb-1 ${isComplexProblem ? 'font-normal' : 'font-mono'}`}>
                      {step.expression}
                    </p>
                    <p className="text-sm text-gray-500">{step.explanation}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Final Answer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center">
                <span className="text-lg font-semibold mr-2">
                  {isUnsupportedProblem ? "Status:" : "Answer:"}
                </span>
                <span className={`text-lg font-mono ${isUnsupportedProblem ? "text-amber-600" : "text-primary"}`}>
                  {result.answer}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onSolveNew}>
            {isUnsupportedProblem ? "Try Another Problem" : "Solve Another Problem"}
          </Button>
          {!isUnsupportedProblem && (
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleCopyResult}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Result'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
