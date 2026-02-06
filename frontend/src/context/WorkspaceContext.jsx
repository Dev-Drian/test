import { createContext, useContext } from "react";

export const WorkspaceContext = createContext(null);

/**
 * Hook para acceder al contexto del workspace
 */
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceContext.Provider");
  }
  return context;
}
