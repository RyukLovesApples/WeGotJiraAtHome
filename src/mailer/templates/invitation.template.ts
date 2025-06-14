export const inviteEmailTemplate = (
  inviteLink: string,
  projectName: string,
) => `
    <h2>You've been invited to join the project: ${projectName}</h2>
    <p>Click the link below to accept your invitation:</p>
    <a href="${inviteLink}" target="_blank" style="color: blue;">
      Join Project
    </a>
    <p>This link will expire in 72 hours.</p>
`;
