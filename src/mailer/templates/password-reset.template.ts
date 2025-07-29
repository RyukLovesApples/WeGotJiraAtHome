export const passwordResetTemplate = (
  passwordResetLink: string,
  username: string,
) => `
  <h2>Hi ${username},</h2>
  <p>You requested a password reset for <strong>WeGotJiraAtHome</strong>.</p>
  <p>
    <a href="${passwordResetLink}" target="_blank" style="color: blue; font-weight: bold;">
      Click here to reset your password
    </a>
  </p>
  <p>This link is valid for 1 hour.</p>
  <p>If you didn’t request this, you can ignore this email.</p>
`;
