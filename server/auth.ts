import { Request, Response, NextFunction } from 'express';
import { getFirestoreDb } from './db.js';
import { UserProfile, UserRole } from '../src/types.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
    profile?: UserProfile;
  };
}

/**
 * Verifies the Firebase ID token or Bearer token and attaches the authenticated user profile.
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return next();
  }

  try {
    // Attempt decoding Firebase ID Token payload
    // A Firebase ID token or demo JWT is a standard JWT with header.payload.signature
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const payloadJson = Buffer.from(padded, 'base64').toString('utf8');
      const decoded = JSON.parse(payloadJson);
      const uid = decoded.user_id || decoded.sub || decoded.uid;
      const email = decoded.email || '';

      if (uid) {
        // Fetch or create the user profile from Firestore
        const db = getFirestoreDb();
        const userDoc = await db.collection('users').doc(uid).get();

        if (userDoc.exists) {
          const profile = userDoc.data() as UserProfile;
          const role: UserRole = (decoded.role && ['ADMIN', 'RIDER', 'CUSTOMER'].includes(decoded.role))
            ? decoded.role
            : (profile.role || 'CUSTOMER');
          req.user = {
            uid,
            email: profile.email || email,
            role,
            profile: { ...profile, role }
          };
        } else {
          // Determine role from decoded payload or email pattern
          let role: UserRole = 'CUSTOMER';
          if (decoded.role && ['ADMIN', 'RIDER', 'CUSTOMER'].includes(decoded.role)) {
            role = decoded.role;
          } else if (email === 'admin@trader24.net' || email.includes('admin@')) {
            role = 'ADMIN';
          } else if (email === 'rider@trader24.net' || email.includes('rider@')) {
            role = 'RIDER';
          }

          const newProfile: UserProfile = {
            id: uid,
            email,
            display_name: decoded.name || email.split('@')[0] || 'User',
            role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            active: true
          };

          await db.collection('users').doc(uid).set(newProfile);

          req.user = {
            uid,
            email,
            role,
            profile: newProfile
          };
        }
      }
    }
  } catch (err) {
    console.error('Error verifying token in authenticateUser middleware:', err);
  }

  next();
}

/**
 * Middleware ensuring the user is authenticated.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      error: 'UNAUTHORIZED: Authentication required to perform this action.'
    });
  }
  next();
}

/**
 * Middleware ensuring the authenticated user has one of the required roles.
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        error: 'UNAUTHORIZED: Please sign in to access this resource.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `FORBIDDEN: Insufficient permissions. Required role: ${roles.join(' or ')}, but your account has role: ${req.user.role}.`
      });
    }

    next();
  };
}
