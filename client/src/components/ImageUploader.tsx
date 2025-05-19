import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Edit } from "lucide-react";

interface ImageUploaderProps {
  stage: 'upload' | 'preview';
  previewUrl: string;
  onFileSelect: (file: File) => void;
  onProcessImage: () => void;
  onCancel: () => void;
}

export default function ImageUploader({
  stage,
  previewUrl,
  onFileSelect,
  onProcessImage,
  onCancel
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
    }
  };

  const validateAndProcessFile = (file: File) => {
    // Validate file type
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
      alert("Please select a valid image file (JPEG or PNG)");
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload Math Problem</h2>
        
        {stage === 'upload' && (
          <div 
            className={`border-2 border-dashed ${dragActive ? 'border-primary bg-blue-50' : 'border-gray-300'} rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center py-8">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-400 mb-1">PNG, JPG or JPEG (max. 5MB)</p>
              <p className="text-xs text-gray-400 px-4 text-center">For best results, upload a clear image of a simple algebraic expression or equation</p>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/png, image/jpeg" 
              onChange={handleFileChange}
            />
          </div>
        )}
        
        {stage === 'preview' && (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-md mx-auto mb-4">
              <img 
                className="w-full h-auto rounded-lg shadow-sm"
                src={previewUrl} 
                alt="Preview of math problem" 
              />
              <Button 
                variant="outline"
                size="icon"
                className="absolute bottom-3 right-3 bg-white hover:bg-gray-100 rounded-full shadow-md"
                onClick={() => fileInputRef.current?.click()}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg" 
                onChange={handleFileChange}
              />
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={onProcessImage}
                className="flex items-center gap-1"
              >
                Solve Problem
              </Button>
              <Button 
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
