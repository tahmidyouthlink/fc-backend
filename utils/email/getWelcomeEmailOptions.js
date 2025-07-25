const getWelcomeEmailOptions = (fullName, email, promo, products) => {
  const options = {
    from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to ${process.env.COMPANY_NAME}! Let's Get Posh!`,
    text: `Welcome ${fullName}!

      We are thrilled to have you join our fashion-forward platform, ${process.env.COMPANY_NAME.toUpperCase()}!
            
      Expect exclusive drops, early access to new collections, and more!

      GET ${promo.amount} OFF
      FROM YOUR NEXT ORDER

      Copy & paste this promocode: ${promo.code}

      Ready to start shopping?

      ${products
        .map((product) => {
          const priceLine = product.originalPrice
            ? `৳ ${product.originalPrice} → ৳ ${product.price}`
            : `৳ ${product.price}`;
          return `${product.title}\n${priceLine}\nView: ${product.pageUrl}`;
        })
        .join("\n\n")}

      View All: ${process.env.MAIN_DOMAIN_URL}/shop
      
      ------------------------------------
      
      GOT A QUESTION?
      We're here to help you
      
      Feel free to contact us at ${process.env.COMPANY_EMAIL}
      or call us at ${process.env.COMPANY_PHONE.replace(/-/g, " ")}
      Sunday through Thursday 8:30-5:30 BST
      
      Follow us:
      Facebook: https://facebook.com
      Instagram: https://instagram.com
      Twitter: https://twitter.com
      TikTok: https://tiktok.com
      
      ${process.env.COMPANY_NAME} | Your service is all we care | Stay Posh
      
      FAQ: ${process.env.MAIN_DOMAIN_URL}/faq  
      Contact Us: ${process.env.MAIN_DOMAIN_URL}/contact`,
    html: `<!DOCTYPE html>
      <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

      <head>
        <title></title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]>
      <xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument>
      <o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
      <![endif]-->
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
          }

          a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: inherit !important;
          }

          #MessageViewBody a {
            color: inherit;
            text-decoration: none;
          }

          p {
            line-height: inherit
          }

          .desktop_hide,
          .desktop_hide table {
            mso-hide: all;
            display: none;
            max-height: 0px;
            overflow: hidden;
          }

          .image_block img+div {
            display: none;
          }

          sup,
          sub {
            font-size: 75%;
            line-height: 0;
          }

          @media (max-width:670px) {

            .desktop_hide table.icons-inner,
            .social_block.desktop_hide .social-table {
              display: inline-block !important;
            }

            .icons-inner {
              text-align: center;
            }

            .icons-inner td {
              margin: 0 auto;
            }

            .image_block div.fullWidth {
              max-width: 100% !important;
            }

            .mobile_hide {
              display: none;
            }

            .row-content {
              width: 100% !important;
            }

            .stack .column {
              width: 100%;
              display: block;
            }

            .mobile_hide {
              min-height: 0;
              max-height: 0;
              max-width: 0;
              overflow: hidden;
              font-size: 0px;
            }

            .desktop_hide,
            .desktop_hide table {
              display: table !important;
              max-height: none !important;
            }

            .row-3 .column-1 .block-2.paragraph_block td.pad>div,
            .row-3 .column-1 .block-4.paragraph_block td.pad>div {
              font-size: 14px !important;
            }

            .row-3 .column-1 .block-1.paragraph_block td.pad>div,
            .row-5 .column-1 .block-1.paragraph_block td.pad>div {
              font-size: 22px !important;
            }

            .row-5 .column-1 .block-2.paragraph_block td.pad>div {
              font-size: 16px !important;
            }

            .row-5 .row-content,
            .row-6 .row-content {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }

            .row-3 .column-1 {
              padding: 50px 20px 0 !important;
            }

            .row-7 .column-1 {
              padding: 40px 20px !important;
            }
          }
        </style><!--[if mso ]><style>sup, sub { font-size: 100% !important; } sup { mso-text-raise:10% } sub { mso-text-raise:-10% }</style> <![endif]-->
      </head>

      <body class="body" style="background-color: #F5F5F5; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
        <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #F5F5F5;">
          <tbody>
            <tr>
              <td>
                <table
                    class="row row-1 mobile_hide"
                    align="center"
                    width="100%"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
                  >
                    <tbody>
                      <tr>
                        <td>
                          <table
                            class="row-content stack"
                            align="center"
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              color: #000000;
                              width: 650px;
                              margin: 0 auto;
                            "
                            width="650"
                          >
                            <tbody>
                              <tr>
                                <td
                                  class="column column-1"
                                  width="100%"
                                  style="
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    font-weight: 400;
                                    text-align: left;
                                    vertical-align: top;
                                  "
                                >
                                  <div
                                    class="spacer_block block-1"
                                    style="
                                      height: 30px;
                                      line-height: 30px;
                                      font-size: 1px;
                                    "
                                  >
                                    &#8202;
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table
                    class="row row-2"
                    align="center"
                    width="100%"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
                  >
                    <tbody>
                      <tr>
                        <td>
                          <table
                            class="row-content"
                            align="center"
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              background-color: #ffffff;
                              color: #333;
                              width: 650px;
                              margin: 0 auto;
                            "
                            width="650"
                          >
                            <tbody>
                              <tr>
                                <td
                                  class="column column-1"
                                  width="100%"
                                  style="
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    font-weight: 400;
                                    text-align: left;
                                    padding-bottom: 15px;
                                    padding-top: 15px;
                                    vertical-align: top;
                                  "
                                >
                                  <table
                                    class="image_block block-1"
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                    "
                                  >
                                    <tr>
                                      <td
                                        class="pad"
                                        style="
                                          width: 100%;
                                          padding-right: 0px;
                                          padding-left: 0px;
                                        "
                                      >
                                        <div class="alignment" align="center">
                                          <div style="max-width: 130px">
                                            <a
                                              href="${
                                                process.env.MAIN_DOMAIN_URL
                                              }"
                                              target="_blank"
                                              ><img
                                                src="https://9b9bd796c4.imgdist.com/pub/bfra/q6hiwcjj/brl/r1c/ovx/logo.png"
                                                style="
                                                  display: block;
                                                  height: auto;
                                                  border: 0;
                                                  width: 100%;
                                                "
                                                width="130"
                                                alt="${
                                                  process.env.MAIN_DOMAIN_URL
                                                } Logo"
                                                title="${
                                                  process.env.MAIN_DOMAIN_URL
                                                } Logo"
                                                height="auto"
                                            /></a>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tbody>
                    <tr>
                      <td>
                        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ecf3ea; color: #000000; width: 650px; margin: 0 auto;" width="650">
                          <tbody>
                            <tr>
                              <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-left: 30px; padding-right: 30px; padding-top: 50px; vertical-align: top;">
                                <table class="paragraph_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                  <tr>
                                    <td class="pad" style="padding-bottom:20px;">
                                      <div style="color:#444444;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:28px;line-height:1.2;text-align:center;mso-line-height-alt:34px;">
                                        <p style="margin: 0; word-break: break-word;"><strong><span style="word-break: break-word;">Welcome <span style="word-break: break-word; color: #29972d;">${fullName}!</span></span></strong></p>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                                <table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                  <tr>
                                    <td class="pad">
                                      <div style="color:#555555;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:16px;line-height:1.2;text-align:center;mso-line-height-alt:19px;">
                                        <p style="margin: 0; word-break: break-word;">We are thrilled to have you join our fashion-forward platform, <strong>${process.env.COMPANY_NAME.toUpperCase()}!</strong></p>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                                <table class="image_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                  <tr>
                                    <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
                                      <div class="alignment" align="center">
                                        <div class="fullWidth" style="max-width: 413px;"><img src="https://9b9bd796c4.imgdist.com/pub/bfra/q6hiwcjj/1rk/f4j/z8d/celebrate.png" style="display: block; height: auto; border: 0; width: 100%;" width="413" alt="Welcome Image" title="Welcome Image" height="auto"></div>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                                <table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                  <tr>
                                    <td class="pad" style="padding-bottom:40px;">
                                      <div style="color:#555555;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:16px;line-height:1.2;text-align:center;mso-line-height-alt:19px;">
                                        <p style="margin: 0; word-break: break-word;">Expect exclusive drops, early access to new collections, and more!</p>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table class="row row-4" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tbody>
                    <tr>
                      <td>
                        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 650px; margin: 0 auto;" width="650">
                          <tbody>
                            <tr>
                              <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; border-bottom: 30px solid #ecf3ea; border-left: 30px solid #ecf3ea; border-right: 30px solid #ecf3ea; padding-bottom: 40px; padding-top: 40px; vertical-align: top; border-radius: 0px;">
                                <table class="text_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                  <tr>
                                    <td class="pad" style="padding-bottom:20px;padding-left:20px;padding-right:20px;">
                                      <div style="font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;">
                                        <div class style="font-size: 12px; font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #444444; line-height: 1.2;">
                                          <p style="margin: 0; font-size: 12px; text-align: center; mso-line-height-alt: 14.399999999999999px;"><span style="word-break: break-word; font-size: 28px;"><strong><span style="word-break: break-word;">GET ${
                                            promo.amount
                                          } OFF</span> </strong></span></p>
                                          <p style="margin: 0; font-size: 12px; text-align: center; mso-line-height-alt: 14.399999999999999px;"><span style="word-break: break-word; font-size: 14px;"><strong>FROM YOUR NEXT ORDER</strong></span></p>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                                <table class="text_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                  <tr>
                                    <td class="pad" style="padding-left:20px;padding-right:20px;">
                                      <div style="font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;">
                                        <div class style="font-size: 12px; font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2;">
                                          <p style="margin: 0; font-size: 12px; text-align: center; mso-line-height-alt: 14.399999999999999px;"><span style="word-break: break-word; font-size: 16px;"><span style="word-break: break-word;">Copy & paste this promocode</span><span style="word-break: break-word; color: #052d3d;"><strong> 👉 &nbsp;<span style="word-break: break-word; background-color: #d4ffce;"> ${
                                            promo.code
                                          }&nbsp;</span></strong></span></span></p>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table class="row row-5" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tbody>
                    <tr>
                      <td>
                        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fffaf4; color: #000000; padding-left: 40px; padding-right: 40px; width: 650px; margin: 0 auto;" width="650">
                          <tbody>
                            <tr>
                              <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 10px; padding-top: 40px; vertical-align: top;">
                                <table class="paragraph_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                  <tr>
                                    <td class="pad" style="padding-bottom:5px;">
                                      <div style="color:#444444;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:26px;line-height:1.2;text-align:center;mso-line-height-alt:31px;">
                                        <p style="margin: 0; word-break: break-word;"><span style="word-break: break-word;"><strong><span style="word-break: break-word; color: #29972d;">&nbsp;</span>Ready to start <span style="word-break: break-word; color: #29972d;">shopping</span>?</strong></span></p>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                                <table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                  <tr>
                                    <td class="pad">
                                      <div style="color:#555555;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:18px;line-height:1.2;text-align:center;mso-line-height-alt:22px;">
                                        <p style="margin: 0; word-break: break-word;"><span style="word-break: break-word;">Use the promocode for ${
                                          promo.amount
                                        } off</span></p>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table class="row row-6" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tbody>
                    <tr>
                      <td>
                        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #fffaf4; padding-left: 30px; padding-right: 30px; width: 650px; margin: 0 auto;" width="650">
                          <tbody>
                            <tr>
                              ${products
                                .map(
                                  (product, index) => `
                                <td class="column column-${
                                  index + 1
                                }" width="33.333%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; ${
                                    index < products.length - 1
                                      ? "border-right: 1px solid #EFEFEF;"
                                      : ""
                                  }">
                                  <a href="${
                                    product.pageUrl
                                  }" target="_blank" style="text-decoration: none;">
                                    <table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                      <tr>
                                        <td class="pad" style="width:100%;">
                                          <div class="alignment" align="center">
                                            <table role="presentation" width="100%" style="height: 200px;">
                                              <tr>
                                                <td align="center" valign="middle" style="height: 200px;">
                                                  <img src="${
                                                    product.imageUrl
                                                  }" 
                                                    style="display: block; max-width: 100%; max-height: 100%; height: auto; width: auto; border: 0;" 
                                                    alt="Product Image" 
                                                    title="Product Image" />
                                                </td>
                                              </tr>
                                            </table>
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                    <table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                      <tr>
                                        <td class="pad">
                                          <div style="color:#555555;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:16px;line-height:1.2;text-align:center; padding-top: 10px;padding-bottom: 5px;">
                                            <p style="margin: 0;"><strong>${
                                              product.title
                                            }</strong></p>
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                    <table class="text_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                      <tr>
                                        <td class="pad">
                                          <div style="font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;">
                                            <div style="font-size: 12px; color: #555555; line-height: 1.2; text-align: center;">
                                              <p style="margin: 0; font-size: 14px;">
                                                <strong>
                                                  ${
                                                    product.originalPrice
                                                      ? `<span style="text-decoration: line-through; color: #777777;">৳ ${product.originalPrice.toLocaleString()}</span> `
                                                      : ""
                                                  }
                                                  ৳ ${product.price.toLocaleString()}
                                                </strong>
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                  </a>
                                </td>
                                ${
                                  index < products.length - 1
                                    ? `
                                  <td class="column gap" style="vertical-align: top; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left;">
                                    <table width="20" height="20" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"></table>
                                  </td>`
                                    : ""
                                }
                              `
                                )
                                .join("")}
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table class="row row-7" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tbody>
                    <tr>
                      <td>
                        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fffaf4; color: #000000; width: 650px; margin: 0 auto;" width="650">
                          <tbody>
                            <tr>
                              <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 40px; padding-left: 30px; padding-right: 30px; padding-top: 40px; vertical-align: top;">
                                <table class="button_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                  <tr>
                                    <td class="pad" style="text-align:center;">
                                      <div class="alignment" align="center"><a href="${
                                        process.env.MAIN_DOMAIN_URL
                                      }/shop" target="_blank" style="color:#555555;text-decoration:none;"><!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="${
                                          process.env.MAIN_DOMAIN_URL
                                        }/shop"  style="height:38px;width:92px;v-text-anchor:middle;" arcsize="11%" fillcolor="#fbcfb0">
                                        <v:stroke dashstyle="Solid" weight="0px" color="#fbcfb0"/>
                                        <w:anchorlock/>
                                        <v:textbox inset="0px,0px,0px,0px">
                                        <center dir="false" style="color:#555555;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:14px">
                                        <![endif]--><span class="button" style="background-color: #fbcfb0; border-bottom: 0px solid transparent; border-left: 0px solid transparent; border-radius: 4px; border-right: 0px solid transparent; border-top: 0px solid transparent; color: #555555; display: inline-block; font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 400; mso-border-alt: none; padding-bottom: 5px; padding-top: 5px; padding-left: 20px; padding-right: 20px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 28px;"><strong>View All</strong></span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
                  <table
                    class="row row-5"
                    align="center"
                    width="100%"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
                  >
                    <tbody>
                      <tr>
                        <td>
                          <table
                            class="row-content stack"
                            align="center"
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              background-color: #ffffff;
                              color: #000000;
                              width: 650px;
                              margin: 0 auto;
                              padding-left: 0 !important;
                              padding-right: 0 !important;
                            "
                            width="650"
                          >
                            <tbody>
                              <tr>
                                <td
                                  class="column column-1"
                                  width="100%"
                                  style="
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    font-weight: 400;
                                    text-align: left;
                                    border-bottom: 20px solid #fffaf4;
                                    border-left: 20px solid #fffaf4;
                                    border-right: 20px solid #fffaf4;
                                    border-top: 20px solid #fffaf4;
                                    padding-bottom: 40px;
                                    padding-left: 20px;
                                    padding-right: 20px;
                                    padding-top: 40px;
                                    vertical-align: top;
                                  "
                                >
                                  <table
                                    class="paragraph_block block-1"
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      word-break: break-word;
                                    "
                                  >
                                    <tr>
                                      <td class="pad" style="padding-bottom: 5px">
                                        <div
                                          style="
                                            color: #444444;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 26px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 31px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <span style="word-break: break-word"
                                              ><strong
                                                ><span style="word-break: break-word"
                                                  ><span
                                                    style="
                                                      word-break: break-word;
                                                      color: #29972d;
                                                    "
                                                    >GOT A QUESTION?</span
                                                  ></span
                                                ></strong
                                              ><br
                                            /></span>
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    class="paragraph_block block-2"
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      word-break: break-word;
                                    "
                                  >
                                    <tr>
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #444444;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 18px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 22px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <span style="word-break: break-word"
                                              >We're here to help you</span
                                            >
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    class="paragraph_block block-3"
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      word-break: break-word;
                                    "
                                  >
                                    <tr>
                                      <td class="pad" style="padding-top: 20px">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.5;
                                            text-align: center;
                                            mso-line-height-alt: 24px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <span style="word-break: break-word"
                                              >Feel free to contact us at
                                              <strong
                                                ><a
                                                  href="mailto:${
                                                    process.env.COMPANY_EMAIL
                                                  }"
                                                  target="_blank"
                                                  rel="noopener"
                                                  title="${
                                                    process.env.COMPANY_EMAIL
                                                  }"
                                                  style="
                                                    text-decoration: none;
                                                    color: #29972d;
                                                  "
                                                  >${
                                                    process.env.COMPANY_EMAIL
                                                  }</a
                                                ></strong
                                              ></span
                                            ><br /><span
                                              style="word-break: break-word"
                                              >or call us at
                                              <a
                                                href="tel:+88${process.env.COMPANY_PHONE.replace(
                                                  /-/g,
                                                  ""
                                                )}"
                                                target="_blank"
                                                title="tel:+88${process.env.COMPANY_PHONE.replace(
                                                  /-/g,
                                                  ""
                                                )}"
                                                rel="noopener"
                                                style="
                                                  text-decoration: none;
                                                  color: #29972d;
                                                "
                                                ><span
                                                  style="
                                                    word-break: break-word;
                                                    color: #29972d;
                                                  "
                                                  ><strong
                                                    >${process.env.COMPANY_PHONE.replace(
                                                      /-/g,
                                                      " "
                                                    )}</strong
                                                  ></span
                                                ></a
                                              ><br /><strong
                                                >Sunday through Thursday 8:30-5:30
                                                BST</strong
                                              ></span
                                            >
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table
                    class="row row-6"
                    align="center"
                    width="100%"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
                  >
                    <tbody>
                      <tr>
                        <td>
                          <table
                            class="row-content stack"
                            align="center"
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              color: #000000;
                              width: 650px;
                              margin: 0 auto;
                            "
                            width="650"
                          >
                            <tbody>
                              <tr>
                                <td
                                  class="column column-1"
                                  width="100%"
                                  style="
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    font-weight: 400;
                                    text-align: left;
                                    padding-bottom: 30px;
                                    padding-top: 30px;
                                    vertical-align: top;
                                  "
                                >
                                  <table
                                    class="social_block block-1"
                                    width="100%"
                                    border="0"
                                    cellpadding="10"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                    "
                                  >
                                    <tr>
                                      <td class="pad">
                                        <div class="alignment" align="center">
                                          <table
                                            class="social-table"
                                            width="184px"
                                            border="0"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                            style="
                                              mso-table-lspace: 0pt;
                                              mso-table-rspace: 0pt;
                                              display: inline-block;
                                            "
                                          >
                                            <tr>
                                              <td style="padding: 0 7px 0 7px">
                                                <a
                                                  href="https://www.facebook.com"
                                                  target="_blank"
                                                  ><img
                                                    src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/circle-color/facebook@2x.png"
                                                    width="32"
                                                    height="auto"
                                                    alt="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } Facebook"
                                                    title="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } Facebook"
                                                    style="
                                                      display: block;
                                                      height: auto;
                                                      border: 0;
                                                    "
                                                /></a>
                                              </td>
                                              <td style="padding: 0 7px 0 7px">
                                                <a
                                                  href="https://www.instagram.com"
                                                  target="_blank"
                                                  ><img
                                                    src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/circle-color/instagram@2x.png"
                                                    width="32"
                                                    height="auto"
                                                    alt="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } Instagram"
                                                    title="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } Instagram"
                                                    style="
                                                      display: block;
                                                      height: auto;
                                                      border: 0;
                                                    "
                                                /></a>
                                              </td>
                                              <td style="padding: 0 7px 0 7px">
                                                <a
                                                  href="https://www.twitter.com"
                                                  target="_blank"
                                                  ><img
                                                    src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/circle-color/twitter@2x.png"
                                                    width="32"
                                                    height="auto"
                                                    alt="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } Twitter"
                                                    title="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } Twitter"
                                                    style="
                                                      display: block;
                                                      height: auto;
                                                      border: 0;
                                                    "
                                                /></a>
                                              </td>
                                              <td style="padding: 0 7px 0 7px">
                                                <a
                                                  href="https://www.tiktok.com"
                                                  target="_blank"
                                                  ><img
                                                    src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/circle-color/tiktok@2x.png"
                                                    width="32"
                                                    height="auto"
                                                    alt="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } TikTok"
                                                    title="${
                                                      process.env
                                                        .MAIN_DOMAIN_URL
                                                    } TikTok"
                                                    style="
                                                      display: block;
                                                      height: auto;
                                                      border: 0;
                                                    "
                                                /></a>
                                              </td>
                                            </tr>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    class="paragraph_block block-2"
                                    width="100%"
                                    border="0"
                                    cellpadding="10"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      word-break: break-word;
                                    "
                                  >
                                    <tr>
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 14px;
                                            line-height: 1.5;
                                            text-align: center;
                                            mso-line-height-alt: 21px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            ${
                                              process.env.COMPANY_NAME
                                            } | Your service is all we care |
                                            Stay Posh
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    class="divider_block block-3"
                                    width="100%"
                                    border="0"
                                    cellpadding="10"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                    "
                                  >
                                    <tr>
                                      <td class="pad">
                                        <div class="alignment" align="center">
                                          <table
                                            border="0"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                            width="60%"
                                            style="
                                              mso-table-lspace: 0pt;
                                              mso-table-rspace: 0pt;
                                            "
                                          >
                                            <tr>
                                              <td
                                                class="divider_inner"
                                                style="
                                                  font-size: 1px;
                                                  line-height: 1px;
                                                  border-top: 1px dotted #c4c4c4;
                                                "
                                              >
                                                <span style="word-break: break-word"
                                                  >&#8202;</span
                                                >
                                              </td>
                                            </tr>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    class="paragraph_block block-4"
                                    width="100%"
                                    border="0"
                                    cellpadding="10"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      word-break: break-word;
                                    "
                                  >
                                    <tr>
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #4f4f4f;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 14px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 17px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <span style="word-break: break-word"
                                              ><a
                                                style="
                                                  text-decoration: none;
                                                  color: #29972d;
                                                "
                                                href="${
                                                  process.env.MAIN_DOMAIN_URL
                                                }/faq"
                                                target="_blank"
                                                rel="noopener"
                                                ><strong>FAQ</strong></a
                                              >&nbsp; |&nbsp;
                                              <strong
                                                ><a
                                                  style="
                                                    text-decoration: none;
                                                    color: #29972d;
                                                  "
                                                  href="${
                                                    process.env.MAIN_DOMAIN_URL
                                                  }/contact-us"
                                                  target="_blank"
                                                  rel="noopener"
                                                  >Contact Us</a
                                                >&nbsp;</strong
                                              >
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
          <!-- End -->
        </body>
      </html>`,
  };

  return options;
};

module.exports = getWelcomeEmailOptions;
