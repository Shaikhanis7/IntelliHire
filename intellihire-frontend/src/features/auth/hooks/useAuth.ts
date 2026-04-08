import { useDispatch, useSelector } from 'react-redux';
import { login, register, logout, clearError } from '../slices/authSlice';
import type { AppDispatch, RootState } from '../../../app/store';
import type { LoginCredentials, RegisterCredentials } from '../types/auth.types';
 
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, isLoading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
 
  const handleLogin = async (credentials: LoginCredentials) => {
    const result = await dispatch(login(credentials));
    // unwrap() would throw on rejection and bypass the error state display.
    // Instead we check the action type — error is already in Redux state.
    if (login.rejected.match(result)) {
      throw new Error(result.payload as string); // triggers shake in AuthPage
    }
    return result.payload;
  };
 
  const handleRegister = async (credentials: RegisterCredentials) => {
    const result = await dispatch(register(credentials));
    if (register.rejected.match(result)) {
      throw new Error(result.payload as string); // triggers shake in AuthPage
    }
    return result.payload;
  };
 
  const handleLogout = async () => {
    await dispatch(logout());
  };
 
  const handleClearError = () => {
    dispatch(clearError());
  };
 
  return {
    user,
    token,
    isLoading,
    error,           // raw FastAPI detail string, e.g. "Invalid email or password."
    isAuthenticated,
    login:      handleLogin,
    register:   handleRegister,
    logout:     handleLogout,
    clearError: handleClearError,
  };
};