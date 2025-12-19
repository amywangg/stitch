import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate a random knitting-themed username
function generateUsername(): string {
  const prefixes = [
    'knit', 'purl', 'stitch', 'yarn', 'wool', 'fiber',
    'cable', 'lace', 'sock', 'scarf', 'shawl', 'sweater'
  ];
  const suffixes = [
    'maker', 'crafter', 'lover', 'addict', 'ninja', 'wizard',
    'master', 'queen', 'king', 'fairy', 'knitter', 'stitcher'
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${prefix}${suffix}${number}`;
}

// Generate unique username
async function generateUniqueUsername(): Promise<string> {
  let username = generateUsername();
  let attempts = 0;
  
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) return username;
    username = generateUsername();
    attempts++;
  }
  
  // Fallback with UUID suffix
  return `knitter${uuid().substring(0, 8)}`;
}

export class OAuthController {
  // ============================================================================
  // GOOGLE OAUTH
  // ============================================================================

  async googleAuth(req: Request, res: Response) {
    const { credential } = req.body;

    if (!credential) {
      throw new AppError('Google credential is required', 400);
    }

    try {
      // Verify the Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError('Invalid Google token', 401);
      }

      const { email, name, picture, sub: googleId } = payload;

      if (!email) {
        throw new AppError('Email not provided by Google', 400);
      }

      // Check if OAuth account exists
      let oauthAccount = await prisma.userOauthAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: 'google',
            providerUserId: googleId,
          },
        },
        include: { user: true },
      });

      let user;
      let isNewUser = false;

      if (oauthAccount) {
        // User exists, update last login
        user = oauthAccount.user;
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } else {
        // Check if user exists with this email
        user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // Link Google account to existing user
          await prisma.userOauthAccount.create({
            data: {
              userId: user.id,
              provider: 'google',
              providerUserId: googleId,
            },
          });

          // Update avatar if not set
          if (!user.avatarUrl && picture) {
            await prisma.user.update({
              where: { id: user.id },
              data: { avatarUrl: picture },
            });
          }
        } else {
          // Create new user
          isNewUser = true;
          const username = await generateUniqueUsername();
          
          user = await prisma.user.create({
            data: {
              email,
              username,
              displayName: name || username,
              avatarUrl: picture,
              passwordHash: '', // OAuth users don't have password
              emailVerified: true,
              emailVerifiedAt: new Date(),
              settings: { create: {} },
              stats: { create: {} },
              oauthAccounts: {
                create: {
                  provider: 'google',
                  providerUserId: googleId,
                },
              },
            },
          });
        }
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isNewUser,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      console.error('Google auth error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Google authentication failed', 401);
    }
  }

  // ============================================================================
  // APPLE OAUTH
  // ============================================================================

  async appleAuth(req: Request, res: Response) {
    const { identityToken, user: appleUserData } = req.body;

    if (!identityToken) {
      throw new AppError('Apple identity token is required', 400);
    }

    try {
      // Verify Apple token
      const applePayload = await appleSignin.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false,
      });

      const { sub: appleId, email } = applePayload;

      if (!appleId) {
        throw new AppError('Invalid Apple token', 401);
      }

      // Check if OAuth account exists
      let oauthAccount = await prisma.userOauthAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: 'apple',
            providerUserId: appleId,
          },
        },
        include: { user: true },
      });

      let user;
      let isNewUser = false;

      if (oauthAccount) {
        // User exists, update last login
        user = oauthAccount.user;
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } else {
        // Apple only provides email on first auth
        const userEmail = email || appleUserData?.email;

        // Check if user exists with this email
        if (userEmail) {
          user = await prisma.user.findUnique({ where: { email: userEmail } });
        }

        if (user) {
          // Link Apple account to existing user
          await prisma.userOauthAccount.create({
            data: {
              userId: user.id,
              provider: 'apple',
              providerUserId: appleId,
            },
          });
        } else {
          // Create new user
          isNewUser = true;
          const username = await generateUniqueUsername();
          
          // Apple might provide name on first auth
          const displayName = appleUserData?.name 
            ? `${appleUserData.name.firstName || ''} ${appleUserData.name.lastName || ''}`.trim()
            : username;

          user = await prisma.user.create({
            data: {
              email: userEmail || `apple_${appleId.substring(0, 10)}@privaterelay.appleid.com`,
              username,
              displayName: displayName || username,
              passwordHash: '', // OAuth users don't have password
              emailVerified: true,
              emailVerifiedAt: new Date(),
              settings: { create: {} },
              stats: { create: {} },
              oauthAccounts: {
                create: {
                  provider: 'apple',
                  providerUserId: appleId,
                },
              },
            },
          });
        }
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isNewUser,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      console.error('Apple auth error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Apple authentication failed', 401);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async generateTokens(userId: string, email: string, username: string, role: string) {
    // Generate access token
    const accessToken = jwt.sign(
      { id: userId, email, username, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate refresh token
    const refreshToken = uuid();
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
