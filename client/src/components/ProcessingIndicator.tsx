import { Card, CardContent } from "@/components/ui/card";

export default function ProcessingIndicator() {
  return (
    <Card className="mb-6">
      <CardContent className="p-6 text-center">
        <div className="py-8 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700 font-medium">Processing your math problem...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
        </div>
      </CardContent>
    </Card>
  );
}
