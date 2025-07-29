const getInvitationEmailOptions = (email, magicLink) => {
  const options = {
    from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `You're Invited to Join ${process.env.WEBSITE_NAME}`,
    text: `Hello ${email},
    
                You have been invited to join ${
                  process.env.WEBSITE_NAME
                }. Please use the link below to complete your setup:
    
    
    
                🔗 Magic Link: ${magicLink}
    
    
    
                This link is valid for **72 hours** and will expire on **${new Date(
                  Date.now() + 72 * 60 * 60 * 1000
                ).toLocaleString("en-GB", {
                  timeZone: "Asia/Dhaka",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                  hour12: true,
                })}**.
    
                If you did not expect this invitation, you can safely ignore this email.
    
                Best Regards,  
                ${process.env.WEBSITE_NAME} Team`,
    html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation - ${process.env.WEBSITE_NAME}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f7f7f7;
              }
              .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 10px;
                border: 1px solid #dcdcdc; /* Added border */
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #ddd;
              }
              .header h1 {
                margin: 0;
                color: #007bff;
              }
              .content {
                padding: 20px;
              }
              .content p {
                font-size: 16px;
                line-height: 1.6;
              }
              .cta-button {
                display: inline-block;
                font-size: 16px;
                font-weight: bold;
                color: #4B5563;
                background-color: #d4ffce; /* Updated button background */
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                border: 1px solid #d4ffce; /* Button border */
              }
              .cta-button:hover {
                background-color: #a3f0a3; /* Hover effect */
                border: 1px solid #a3f0a3;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
                font-size: 14px;
                color: #888;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to ${process.env.WEBSITE_NAME}!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${email}</strong>,</p>
                <p>You are invited to join <strong>${process.env.WEBSITE_NAME}</strong>. To accept this invitation, create account:</p>
                 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                 <tr>
                  <td align="center">
                     <a href="${magicLink}" class="cta-button">Create account</a>
                  </td>
                 </tr>
                </table>
    
                <p>If you weren't expecting this invitation, you can ignore this email.</p>
                <p><strong>Note:</strong> This link will expire in <strong>72 hours</strong>.</p>
                
              </div>
              <div class="footer">
                <p>Best Regards, <br><strong>${process.env.WEBSITE_NAME} Team</strong></p>
              </div>
            </div>
            </body>
            </html>`,
  };
  return options;
};

module.exports = getInvitationEmailOptions;
