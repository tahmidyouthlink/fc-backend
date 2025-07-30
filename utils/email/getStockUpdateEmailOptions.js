const getStockUpdateEmailOptions = (email, cartLink) => {
  const options = {
    from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Good news! The product you wanted is back in stock!",
    text: `Hello ${email},
          
                      The product you requested is now available!
      
                      🔗 Add to cart: ${cartLink}
          
                      If you did not expect this email, you can safely ignore this email.
          
                      Best Regards,  
                      ${process.env.WEBSITE_NAME} Team`,
    html: `<!DOCTYPE html>
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
                            <p>The product you requested is now available! You can now add to cart that item :</p>
                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                             <tr>
                              <td align="center">
                                 <a href="${cartLink}" class="cta-button">Add to cart</a>
                              </td>
                             </tr>
                            </table>
          
                            <p>If you weren't expecting this email, you can ignore this email.</p>
                      
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

module.exports = getStockUpdateEmailOptions;
