export const isLoggedIn = () => {
  // Option A: token in localStorage
  return !!localStorage.getItem("token");

  // Option B: if you store user
  // return !!localStorage.getItem("user");
};
