import { Logger } from '@nestjs/common';

const logger = new Logger('AdminEmail');

export function isAdminEmail(email: string | null | undefined): boolean {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '';
  if (!raw.trim()) {
    logger.warn('Neither ADMIN_EMAILS nor ADMIN_EMAIL is configured — denying all admin access');
    return false;
  }
  const adminList = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && adminList.includes(email.toLowerCase());
}
