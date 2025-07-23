const getContactEmailOptions = (fullName, email) => {
  const options = {
    from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Thanks for contacting ${process.env.COMPANY_NAME}! Hang tight - we're on it!`,
    text: `Hi ${fullName}!

      Thank you for reaching out to ${
        process.env.COMPANY_NAME
      }. We have received your message and our support team is already working on it.
            
      Our goal is to get back to you within 48 hours.
    
      In the meantime, feel free to explore our FAQs (https://poshax.shop/faq) or browse our latest collections (https://poshax.shop/shop?filterBy=New+Arrivals).

      Thanks again for contacting us! We truly appreciate your time!
    
      Warm Regards
      ${process.env.COMPANY_NAME} Customer Support Team
      
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
      <html
        xmlns:v="urn:schemas-microsoft-com:vml"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        lang="en"
      >
        <head>
          <title></title>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <!--[if mso]>
            <xml
              ><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"
                ><w:DontUseAdvancedTypographyReadingMail
              /></w:WordDocument>
              <o:OfficeDocumentSettings
                ><o:PixelsPerInch>96</o:PixelsPerInch
                ><o:AllowPNG /></o:OfficeDocumentSettings
            ></xml>
          <![endif]-->
          <!--[if !mso]><!-->
          <!--<![endif]-->
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
              line-height: inherit;
            }

            .desktop_hide,
            .desktop_hide table {
              mso-hide: all;
              display: none;
              max-height: 0px;
              overflow: hidden;
            }

            .image_block img + div {
              display: none;
            }

            sup,
            sub {
              font-size: 75%;
              line-height: 0;
            }

            @media (max-width: 670px) {
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

              .row-4 .column-1 .block-2.paragraph_block td.pad > div,
              .row-4 .column-1 .block-3.paragraph_block td.pad > div,
              .row-5 .column-1 .block-1.paragraph_block td.pad > div,
              .row-5 .column-1 .block-2.paragraph_block td.pad > div,
              .row-5 .column-1 .block-3.paragraph_block td.pad > div,
              .row-6 .column-1 .block-2.paragraph_block td.pad > div {
                font-size: 14px !important;
              }

              .row-4 .column-1 .block-1.paragraph_block td.pad > div,
              .row-6 .column-1 .block-1.paragraph_block td.pad > div {
                font-size: 22px !important;
              }

              .row-7 .column-1 .block-2.paragraph_block td.pad > div,
              .row-7 .column-1 .block-4.paragraph_block td.pad > div {
                font-size: 13px !important;
              }

              .row-3 .column-1,
              .row-4 .column-1 {
                padding: 55px 20px 15px !important;
              }

              .row-5 .column-1 {
                padding: 15px 20px 40px !important;
              }

              .row-6 .column-1 {
                padding: 40px 10px !important;
              }
            }
          </style>
          <!--[if mso
            ]><style>
              sup,
              sub {
                font-size: 100% !important;
              }
              sup {
                mso-text-raise: 10%;
              }
              sub {
                mso-text-raise: -10%;
              }
            </style>
          <![endif]-->
        </head>

        <body
          class="body"
          style="
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: none;
            text-size-adjust: none;
          "
        >
          <table
            class="nl-container"
            width="100%"
            border="0"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
              background-color: #f5f5f5;
            "
          >
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
                                                alt="Image"
                                                title="Image"
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
                  <table
                    class="row row-3"
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
                              background-color: #ecf3ea;
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
                                    padding-left: 40px;
                                    padding-right: 40px;
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
                                          padding-top: 30px;
                                          width: 100%;
                                          padding-right: 0px;
                                          padding-left: 0px;
                                        "
                                      >
                                        <div class="alignment" align="center">
                                          <div
                                            class="fullWidth"
                                            style="max-width: 342px"
                                          >
                                            <img
                                              src="https://9b9bd796c4.imgdist.com/pub/bfra/q6hiwcjj/8b3/piu/gnm/customer-service-68.png"
                                              style="
                                                display: block;
                                                height: auto;
                                                border: 0;
                                                width: 100%;
                                              "
                                              width="342"
                                              alt="Image"
                                              title="Image"
                                              height="auto"
                                            />
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
                  <table
                    class="row row-4"
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
                              background-color: #ecf3ea;
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
                                    padding-bottom: 40px;
                                    padding-left: 40px;
                                    padding-right: 40px;
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
                                      <td class="pad" style="padding-bottom: 20px">
                                        <div
                                          style="
                                            color: #444444;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 28px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 34px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <strong
                                              ><span style="word-break: break-word"
                                                >Hi
                                                <span
                                                  style="
                                                    word-break: break-word;
                                                    color: #29972d;
                                                  "
                                                  >${fullName}!</span
                                                ></span
                                              ></strong
                                            >
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
                                      <td class="pad" style="padding-bottom: 20px">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.5;
                                            text-align: left;
                                            mso-line-height-alt: 24px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            Thank you for reaching out to ${
                                              process.env.COMPANY_NAME
                                            }. We
                                            have received your message and our support
                                            team is already working on it.
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
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.5;
                                            text-align: left;
                                            mso-line-height-alt: 24px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            Our goal is to get back to you within 48
                                            hours.
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
                                    padding-bottom: 40px;
                                    padding-left: 40px;
                                    padding-right: 40px;
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
                                      <td class="pad" style="padding-bottom: 20px">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.5;
                                            text-align: left;
                                            mso-line-height-alt: 24px;
                                          "
                                        >
                                          <p style="margin: 0">
                                            In the meantime, feel free to explore our
                                            <a
                                              href="${
                                                process.env.MAIN_DOMAIN_URL
                                              }/faq"
                                              target="_blank"
                                              style="
                                                text-decoration: underline;
                                                color: #29972d;
                                              "
                                              rel="noopener"
                                              >FAQs</a
                                            >
                                            or browse our
                                            <a
                                              href="${
                                                process.env.MAIN_DOMAIN_URL
                                              }/shop?filterBy=New+Arrivals"
                                              target="_blank"
                                              style="
                                                text-decoration: underline;
                                                color: #29972d;
                                              "
                                              rel="noopener"
                                              >latest collections</a
                                            >!
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
                                      <td class="pad" style="padding-bottom: 20px">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.5;
                                            text-align: left;
                                            mso-line-height-alt: 24px;
                                          "
                                        >
                                          <p style="margin: 0">
                                            Thanks again for contacting us! We truly
                                            appreciate your time!
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
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.5;
                                            text-align: left;
                                            mso-line-height-alt: 24px;
                                          "
                                        >
                                          <p style="margin: 0">
                                            Warm Regards<br />${
                                              process.env.COMPANY_NAME
                                            } Customer Support
                                            Team
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
                              background-color: #f0f0f0;
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
                                    border-bottom: 20px solid #ffffff;
                                    border-left: 20px solid #ffffff;
                                    border-right: 20px solid #ffffff;
                                    border-top: 20px solid #ffffff;
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
                                                    alt="Facebook"
                                                    title="Facebook"
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
                                                    alt="Instagram"
                                                    title="Instagram"
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
                                                    alt="Twitter"
                                                    title="Twitter"
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
                                                    alt="TikTok"
                                                    title="TikTok"
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

module.exports = getContactEmailOptions;
