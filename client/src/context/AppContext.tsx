import { createContext, useContext, useEffect, useState } from "react";
import {
  initialState,
  type ActivityEntry,
  type Credentials,
  type FoodEntry,
  type User,
} from "../types";
import { useNavigate } from "react-router-dom";
import api from "../configs/api";
import toast from "react-hot-toast";

const AppContext = createContext(initialState);

// ✅ moved outside component
const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [isUserFetched, setIsUserFetched] = useState<boolean>(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [allFoodLogs, setAllFoodLogs] = useState<FoodEntry[]>([]);
  const [allActivityLogs, setAllActivityLogs] = useState<ActivityEntry[]>([]);

  const signup = async (credentials: Credentials) => {
    try {
      const { data } = await api.post('/api/auth/local/register', credentials);
      setUser({ ...data.user, token: data.jwt });
      localStorage.setItem("token", data.jwt);
      setAuthToken(data.jwt); // ✅
      setOnboardingCompleted(false);
      navigate("/onboarding");
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const login = async (credentials: Credentials) => {
    try {
      const { data } = await api.post('/api/auth/local', {
        identifier: credentials.email,
        password: credentials.password
      });
      setUser({ ...data.user, token: data.jwt });
      localStorage.setItem("token", data.jwt);
      setAuthToken(data.jwt); // ✅
      await fetchUser(data.jwt);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const fetchUser = async (token: string) => {
    try {
      const { data } = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("USER DATA FROM STRAPI:", data);

      setUser({ ...data, token });
      setAuthToken(token); // ✅

      if (data?.age && data?.weight && data?.goal) {
        setOnboardingCompleted(true);
        navigate("/");
      } else {
        setOnboardingCompleted(false);
        navigate("/onboarding");
      }

    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
    setIsUserFetched(true);
  };

  const fetchFoodLogs = async (token: string) => {
    try {
      const { data } = await api.get('/api/food-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllFoodLogs(data);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const fetchActivityLogs = async (token: string) => {
    try {
      const { data } = await api.get('/api/activity-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllActivityLogs(data);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setOnboardingCompleted(false);
    setAuthToken(null); // ✅
    navigate("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      (async () => {
        await fetchUser(token);
        await fetchFoodLogs(token);
        await fetchActivityLogs(token);
      })();
    } else {
      setIsUserFetched(true);
    }
  }, []);

  const value = {
    user,
    setUser,
    isUserFetched,
    fetchUser,
    signup,
    login,
    logout,
    onboardingCompleted,
    setOnboardingCompleted,
    allFoodLogs,
    allActivityLogs,
    setAllFoodLogs,
    setAllActivityLogs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);