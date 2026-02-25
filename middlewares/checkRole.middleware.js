const checkRole = (requiredRole) => {
  return (req, res, next) => {
    try {

      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (req.user.role !== requiredRole) {
        return res.status(403).json({
          message: "You are not authorized. Only admin can access."
        });
      }

      next();

    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
};

module.exports = checkRole;