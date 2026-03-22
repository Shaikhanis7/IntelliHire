import api from "../../../lib/api";


export const login = async (data: any) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};