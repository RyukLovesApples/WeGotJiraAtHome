import { Address } from 'nodemailer/lib/mailer';

export type SendMailOptions = {
  from?: Address;
  to: string | Address | Address[];
  subject: string;
  html: string;
  text?: string;
};
