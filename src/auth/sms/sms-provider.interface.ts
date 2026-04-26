export interface SmsProvider {
  sendCode(phoneNumber: string, code: string): Promise<void>;
}
