import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Employee session not found. Please log in again."
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    if (!decoded.id || !decoded.role) {
      throw new Error("Invalid token payload.");
    }

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    return next();
  } catch (error) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/"
    });

    if (error.message === "JWT_SECRET is not configured.") {
      console.error(error.message);

      return res.status(500).json({
        message: "Authentication is not configured correctly."
      });
    }

    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again."
    });
  }
}

export default authMiddleware;