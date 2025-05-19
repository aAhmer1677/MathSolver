import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import ResultDisplay from "@/components/ResultDisplay";
import ErrorDisplay from "@/components/ErrorDisplay";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MathResponse } from "@shared/schema";

export default function Home() {
  const [stage, setStage] = useState<'upload' | 'preview' | 'processing' | 'result' | 'error'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<MathResponse | null>(null);

  const processMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("Uploading image with FormData:", formData);
      const response = await apiRequest('POST', '/api/solve', formData, {
        headers: {
          // Don't set Content-Type header - browser will set it with correct boundary for multipart/form-data
        }
      });
      return response.json();
    },
    onSuccess: (data: MathResponse) => {
      setResult(data);
      setStage('result');
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to process the image. Please try again with a clearer image.');
      setStage('error');
    }
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);
    setStage('preview');
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    setStage('processing');
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    
    processMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setStage('upload');
  };

  const handleSolveNew = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
    setStage('upload');
  };

  const handleTryAgain = () => {
    setError('');
    setStage('upload');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">MathSolve</h1>
        <p className="text-gray-600">Upload a photo of your math problem and get the solution instantly</p>
        <div className="mt-4 text-sm text-gray-500 max-w-xl mx-auto">
          <p className="mb-2"><strong>Supported problems:</strong> Basic arithmetic, algebraic expressions, and simple equations</p>
          <p><strong>Example problems:</strong> 2+3*4, 5x+10=25, (7-2)^2</p>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Image Upload Area */}
        {(stage === 'upload' || stage === 'preview') && (
          <ImageUploader 
            stage={stage}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onProcessImage={handleProcessImage}
            onCancel={handleCancel}
          />
        )}

        {/* Processing Indicator */}
        {stage === 'processing' && (
          <ProcessingIndicator />
        )}

        {/* Result Display */}
        {stage === 'result' && result && (
          <ResultDisplay 
            result={result}
            onSolveNew={handleSolveNew}
          />
        )}

        {/* Error Display */}
        {stage === 'error' && (
          <ErrorDisplay 
            message={error}
            onTryAgain={handleTryAgain}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>MathSolve currently supports basic arithmetic, algebraic expressions, and simple equations</p>
        <p className="mt-2"><strong>Note:</strong> Complex word problems, geometry problems, and calculus are not currently supported</p>
        <p className="mt-2">© {new Date().getFullYear()} MathSolve. All rights reserved.</p>
      </footer>
    </div>
  );
}
