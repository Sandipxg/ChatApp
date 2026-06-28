import { auth } from "../config/auth.js";
import AppError from "../utils/AppError.js";

/**
 * Express middleware that checks for a Better Auth session,
 * and adds `req.userId` for downstream handlers.
 */
async function authMiddleware(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session || !session.user) {
      return next(new AppError('Unauthorized: Missing or invalid session', 401));
    }

    req.userId = session.user.id;
    req.session = session;
    next();
  } catch (err) {
    return next(new AppError('Unauthorized: Session verification failed', 401));
  }
}

export default authMiddleware;
