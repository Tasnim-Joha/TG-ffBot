import { db } from '../config/database';
import { otpTokens, users } from '../models/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { sendEmail } from './email';
import { randomInt } from 'crypto';

const OTP_EXPIRY_MINUTES = 10; // will be overridden by settings later

export async function generateAndSendOtp(
  email: string,
  telegramId: number,
  type: 'register' | 'login'
): Promise<void> {
  // Delete any existing unused OTPs for this email+telegram
  await db.delete(otpTokens).where(
    and(
      eq(otpTokens.email, email),
      eq(otpTokens.telegramId, telegramId),
      eq(otpTokens.type, type),
      isNull(otpTokens.usedAt)
    )
  );

  const token = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.insert(otpTokens).values({
    telegramId,
    email,
    token,
    type,
    expiresAt,
  });

  const subject = type === 'register' ? 'Registration OTP' : 'Login OTP';
  const html = `<p>Your OTP code is: <strong>${token}</strong></p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`;
  await sendEmail(email, subject, html);
}

export async function verifyOtpAndCreateUser(
  email: string,
  token: string,
  telegramId: number,
  username: string
): Promise<{ success: boolean; message: string; userId?: number }> {
  const now = new Date();
  const [otp] = await db.select()
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.email, email),
        eq(otpTokens.token, token),
        eq(otpTokens.telegramId, telegramId),
        eq(otpTokens.type, 'register'),
        isNull(otpTokens.usedAt),
        gt(otpTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!otp) {
    return { success: false, message: 'Invalid or expired OTP.' };
  }

  // Mark OTP as used
  await db.update(otpTokens)
    .set({ usedAt: now })
    .where(eq(otpTokens.id, otp.id));

  // Create the user
  const [newUser] = await db.insert(users).values({
    telegramId,
    email,
    name: username,
    role: 'user',
    isLoggedIn: 1,
    lastActivity: now,
    sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  }).$returningId();

  if (!newUser?.id) {
    return { success: false, message: 'Failed to create user account.' };
  }

  return { success: true, message: 'Registration successful!', userId: newUser.id };
}

export async function verifyOtpForLogin(
  email: string,
  token: string,
  telegramId: number
): Promise<{ success: boolean; message: string; userId?: number }> {
  const now = new Date();
  const [otp] = await db.select()
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.email, email),
        eq(otpTokens.token, token),
        eq(otpTokens.telegramId, telegramId),
        eq(otpTokens.type, 'login'),
        isNull(otpTokens.usedAt),
        gt(otpTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!otp) {
    return { success: false, message: 'Invalid or expired OTP.' };
  }

  await db.update(otpTokens)
    .set({ usedAt: now })
    .where(eq(otpTokens.id, otp.id));

  const user = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  if (user.length === 0) {
    return { success: false, message: 'User account not found.' };
  }

  // Update login status
  await setUserLoggedIn(user[0]!.id);
  return { success: true, message: 'Login successful!', userId: user[0]!.id };
}

export async function setUserLoggedIn(userId: number): Promise<void> {
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.update(users)
    .set({
      isLoggedIn: 1,
      lastActivity: new Date(),
      sessionExpiresAt,
    })
    .where(eq(users.id, userId));
}

export async function setUserLoggedOut(userId: number): Promise<void> {
  await db.update(users)
    .set({ isLoggedIn: 0, sessionExpiresAt: null })
    .where(eq(users.id, userId));
}