import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";
import { AlertCircle, Loader, RefreshCw } from "lucide-react";

interface PreviewFrameProps {
  webContainer: WebContainer | undefined;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [installing, setInstalling] = useState(true);
  const [progress, setProgress] = useState(0);

  async function main() {
    try {
      if (!webContainer) {
        setError("WebContainer not available");
        return;
      }

      setInstalling(true);
      setProgress(20);
      console.log("Starting npm install...");

      // Run npm install
      const installProcess = await webContainer.spawn("npm", ["install"]);
      
      // Properly handle the output stream
      installProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            const text = typeof chunk === 'string' 
              ? chunk 
              : new TextDecoder().decode(chunk);
            console.log("Install:", text);
            setProgress((p) => Math.min(p + 5, 80));
          },
        })
      );

      // Wait for install to complete
      const installExit = await installProcess.exit;
      if (installExit !== 0) {
        setError(`npm install failed with exit code ${installExit}`);
        return;
      }

      console.log("✅ npm install completed, starting dev server...");
      setProgress(80);
      setInstalling(false);

      // Start dev server
      const devProcess = await webContainer.spawn("npm", ["run", "dev"]);

      // Stream dev server output
      devProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            const text = typeof chunk === 'string' 
              ? chunk 
              : new TextDecoder().decode(chunk);
            console.log("Dev server:", text);
            setProgress((p) => Math.min(p + 2, 95));
          },
        })
      );

      // Wait for server-ready event
      webContainer.on("server-ready", (port: number, url: string) => {
        console.log(`✅ Server ready at ${url}:${port}`);
        setUrl(url);
        setError("");
        setProgress(100);
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${errorMsg}`);
      console.error("Preview error:", err);
    }
  }

  useEffect(() => {
    if (webContainer) {
      main();
    }
  }, [webContainer]);

  const handleRetry = () => {
    setError("");
    setUrl("");
    setProgress(0);
    main();
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900 relative overflow-auto">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-gradient-to-br from-red-900/90 to-red-800/90 border border-red-600 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-300 flex-shrink-0" />
              <p className="font-bold text-red-100 text-lg">Preview Error</p>
            </div>
            <p className="text-red-100 text-sm mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}
      
      {installing && !url && (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-75 animate-spin" />
              <div className="absolute inset-1 rounded-full bg-gray-900 flex items-center justify-center">
                <Loader className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-200 font-semibold">Building your app...</p>
            <p className="text-gray-400 text-sm">Installing dependencies and starting server</p>
          </div>
          {/* Progress Bar */}
          <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{progress}% complete</p>
        </div>
      )}
      
      {url && !error && (
        <iframe 
          width="100%" 
          height="100%" 
          src={url}
          className="border-0"
        />
      )}

      {!url && !error && !installing && (
        <div className="text-center space-y-4">
          <div className="text-6xl">👀</div>
          <p className="text-gray-400">No preview available yet</p>
          <p className="text-gray-500 text-sm">Start editing to see changes</p>
        </div>
      )}
    </div>
  );
}
