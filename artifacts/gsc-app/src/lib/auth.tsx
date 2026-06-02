import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, AuthUser } from "@workspace/api-client-react";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: queryLoading, isError } = useGetMe({
    query: {
      retry: false,
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!queryLoading) {
      setIsLoading(false);
    }
  }, [queryLoading]);

  const value = {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !isError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
