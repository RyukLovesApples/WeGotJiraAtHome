import { Address } from 'nodemailer/lib/mailer';

export type SendMailOptions = {
  from: Address;
  to: Address | Address[];
  subject: string;
  html: string;
  text?: string;
};
