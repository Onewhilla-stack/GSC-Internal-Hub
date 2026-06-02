import { useContext, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { AuthContext, AuthContextType, AuthUser } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: queryLoading, isError } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!queryLoading) {
      setIsLoading(false);
    }
  }, [queryLoading]);

  const authUser = (user && !isError) ? user as AuthUser : null;

  const value: AuthContextType = {
    user: authUser,
    isLoading,
    isAuthenticated: !!authUser,
    isDirector: authUser?.role === "director",
    isWorker: authUser?.role === "worker",
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
