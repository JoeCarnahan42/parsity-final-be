export const authenticate = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); // user is logged in, continue
  }
  res.status(401).json({ message: "Unauthorized" });
};
