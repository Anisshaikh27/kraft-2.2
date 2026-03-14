import { useEffect, useState } from "react";
import { WebContainer } from "@webcontainer/api";

let webcontainerInstance: WebContainer | null = null;

export function useWebContainer() {
  const [webContainer, setWebContainer] = useState<WebContainer>();

  async function main() {
    if (!webcontainerInstance) {
      webcontainerInstance = await WebContainer.boot();
    }
    setWebContainer(webcontainerInstance);
  }

  useEffect(() => {
    main();
  }, []);

  return webContainer;
}
