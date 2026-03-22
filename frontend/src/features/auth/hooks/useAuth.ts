import { useState } from "react";
import { login } from "../services/authService";
import { saveToken } from "../utils/authStorage";


export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email: any, password: any) => {
    try {
      setLoading(true);
      const res = await login({ email, password });
      saveToken(res.access_token);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { handleLogin, loading };
};