import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface PreviewFrameProps {
  webContainer: WebContainer | undefined;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [installing, setInstalling] = useState(true);

  async function main() {
    try {
      if (!webContainer) {
        setError("WebContainer not available");
        return;
      }

      setInstalling(true);
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
          },
        })
      );

      // Wait for server-ready event
      webContainer.on("server-ready", (port: number, url: string) => {
        console.log(`✅ Server ready at ${url}:${port}`);
        setUrl(url);
        setError("");
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

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900">
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {installing && !url && (
        <div className="text-center">
          <div className="animate-spin mb-4">⚙️</div>
          <p className="text-gray-400 mb-2">Building your app...</p>
          <p className="text-gray-500 text-sm">Installing dependencies and starting server</p>
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
    </div>
  );
}
