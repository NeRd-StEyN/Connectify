import axios from "axios";

axios.defaults.withCredentials = true;
const BASE_URL = import.meta.env.VITE_API_URL;


// Signup
export const signup = async (data) => {
  const res = await axios.post(`${BASE_URL}/signup`, data,{withCredentials: true});
  return res.data;
};

// Login
export const login = async (data) => {
  const res = await axios.post(`${BASE_URL}/login`, data,{withCredentials: true});
  return res.data;
};

// Forgot password (send OTP)
export const sendOtp = async (email) => {
  const res = await axios.post(`${BASE_URL}/forgot-password`, { email });
  return res.data;
};

// Verify OTP and reset password
export const verifyOtp = async ({ otp, newPassword }) => {
  const res = await axios.post(`${BASE_URL}/verify-otp`, { otp, newPassword });
  return res.data;
};


// Get logged-in user
export const getUser = async () => {
  const res = await axios.get(`${BASE_URL}/get-user`);
  return res.data;
};

export const sendrequest=async(recipientId)=>
{
  const res=await axios.post(`${BASE_URL}/sendFriendRequest`,{recipientId}, {
    withCredentials: true, // if using cookies for auth
  });
  return res.data;
}

export const pendingrequest=async()=>
{
  const res=await axios.get(`${BASE_URL}/friendRequests`);
  return res.data;
}

export const friends=async()=>
{
  const res=await axios.get(`${BASE_URL}/friends`);
  return res.data;
}

// api/api.js or top of your component

export const acceptFriendRequest = async (requestId) => {
  return await axios.post(
    `${import.meta.env.VITE_API_URL}/friend-requests/respond`,
    { requestId, action: "accept" },
    { withCredentials: true }
  );
};

export const rejectFriendRequest = async (requestId) => {
  return await axios.post(
    `${import.meta.env.VITE_API_URL}/friend-requests/respond`,
    { requestId, action: "reject" },
    { withCredentials: true }
  );
};


export const addpost = async ({ caption, image }) => {
  const res = await axios.post(
    `${BASE_URL}/insta/post`,
    { caption, image },
    { withCredentials: true }
  );
  return res.data;
};


export const getallpost=async()=>
{
  const res=await axios.get(`${BASE_URL}/insta/posts`);
  return res.data;
}


export const getmypost=async()=>
{
  const res=await axios.get(`${BASE_URL}/insta/myposts`);
  return res.data;
}


export const editpost=async({caption,image,id})=>
{
  const res=await axios.put(`${BASE_URL}/insta/post/${id}`,{caption,image}, { withCredentials: true });
  return res.data;
}



export const deletepost=async(id)=>
{
  const res=await axios.delete(`${BASE_URL}/insta/post/${id}`, { withCredentials: true });
  return res.data;
}



export const likeorunlikepost=async(id)=>
{
  const res=await axios.post(`${BASE_URL}/insta/post/${id}/like`);
  return res.data;
}


export const commentonpost=async({id,text})=>
{
  const res=await axios.post(`${BASE_URL}/insta/post/${id}/comment`,{text}, { withCredentials: true });
  return res.data;
}

export const getcommentspost=async(id)=>
{
  const res=await axios.get(`${BASE_URL}/insta/post/${id}/comments`, { withCredentials: true });
  return res.data;
}




