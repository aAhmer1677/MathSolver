import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  message: string;
  onTryAgain: () => void;
}

export default function ErrorDisplay({ message, onTryAgain }: ErrorDisplayProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">Problem Processing Error</h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>{message || 'Unable to extract the math problem from the image. Please ensure your image is clear and contains a visible math problem.'}</p>
            </div>
            <div className="mt-4">
              <Button 
                onClick={onTryAgain}
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
