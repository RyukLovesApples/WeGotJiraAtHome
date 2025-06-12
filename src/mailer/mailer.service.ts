/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendMailOptions } from './types/send-mail-options.type';
import Mail from 'nodemailer/lib/mailer';

@Injectable()
export class MailerService {
  mailTransport() {
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'adonis89@ethereal.email',
        pass: 'jn7jnAPss4f63QBp6D',
      },
    });
    return transporter;
  }
  async sendEmail(mailData: SendMailOptions) {
    const { from, to, subject, html } = mailData;
    const transporter = this.mailTransport();
    const options: Mail.Options = {
      from: from ?? {
        name: 'WeGotJiraAtHome',
        address: 'adonis89@ethereal.email',
      },
      to,
      subject,
      html,
    };
    try {
      const result = await transporter.sendMail(options);
      return result;
    } catch (error) {
      console.error('Could not send invitation mail: ', error);
    }
  }
}
