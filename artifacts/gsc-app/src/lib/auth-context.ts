import { createContext } from "react";

export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDirector: boolean;
  isWorker: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
