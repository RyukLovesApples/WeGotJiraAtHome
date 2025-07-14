export const emailVerificationTemplate = (
  emailVerificationLink: string,
  username: string,
) => `
  <h2>Hello ${username},</h2>
  <p>Thank you for registering with <strong>WeGotJiraAtHome</strong>.</p>
  <p>To complete your registration and unlock full access, please verify your email address by clicking the link below:</p>
  <p>
    <a href="${emailVerificationLink}" target="_blank" style="color: blue; font-weight: bold;">
      Verify your email
    </a>
  </p>
  <p>This link is valid for 24 hours.</p>
  <p>If you did not sign up, you can safely ignore this email.</p>
`;
