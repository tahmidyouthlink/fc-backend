module.exports = function refundedEmail(order) {
  const { customerInfo, orderNumber, returnInfo, paymentInfo } = order;
  const website = process.env.WEBSITE_NAME;

  return {
    from: `${website} <${process.env.EMAIL_USER}>`,
    to: customerInfo.email,
    subject: `Your Refund Has Been Processed!`,
    text: `Hi ${customerInfo.customerName},

We want to let you know that your refund for Return Order #${orderNumber} has been successfully processed!

Refund Details:
Amount Refunded: ৳ ${returnInfo.refundAmount}
Payment Method: ${paymentInfo.paymentMethod || "N/A"}
Refund Processed Date: ${returnInfo.refundProcessedDate}

The refunded amount should reflect in your account/wallet within 3–10 business days, depending on your bank or payment provider.

If you have any questions or need further assistance, feel free to contact us. We’re always here to help!

Thank you for shopping with us!

Stay Posh,  
PoshaX Team`,
    html: `
    <!DOCTYPE html>
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

      #converted-body .list_block ul,
      #converted-body .list_block ol,
      .body [class~="x_list_block"] ul,
      .body [class~="x_list_block"] ol,
      u + .body .list_block ul,
      u + .body .list_block ol {
        padding-left: 20px;
      }

      @media (max-width: 620px) {
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

        .row-2 .column-1 .block-2.paragraph_block td.pad > div {
          font-size: 22px !important;
        }

        .row-2 .column-1 .block-3.paragraph_block td.pad > div,
        .row-3 .column-1 .block-1.paragraph_block td.pad > div,
        .row-3 .column-1 .block-5.paragraph_block td.pad > div,
        .row-3 .column-1 .block-6.paragraph_block td.pad > div,
        .row-3 .column-1 .block-7.paragraph_block td.pad > div,
        .row-4 .column-1 .block-3.paragraph_block td.pad > div {
          font-size: 14px !important;
        }

        .row-3 .column-1 .block-1.paragraph_block td.pad {
          padding: 0 0 10px !important;
        }

        .row-3 .column-1 .block-2.list_block ul,
        .row-3 .column-1 .block-3.list_block ul,
        .row-3 .column-1 .block-4.list_block ul {
          font-size: 14px !important;
          line-height: auto !important;
        }

        .row-4 .column-1 .block-1.paragraph_block td.pad > div {
          font-size: 23px !important;
        }

        .row-4 .column-1 .block-2.paragraph_block td.pad > div {
          font-size: 17px !important;
        }

        .row-3 .column-1 {
          padding: 15px 20px 40px !important;
        }

        .row-4 .column-1 {
          padding: 40px 10px !important;
        }
        
        .row-top-footer .column-1 {
                padding: 40px 10px !important;
              }

              .row-top-footer .column-1 .block-1.paragraph_block td.pad > div {
                font-size: 20px !important;
              }

              .row-top-footer .column-1 .block-2.paragraph_block td.pad > div {
                font-size: 16px !important;
              }

              .row-top-footer .column-1 .block-3.paragraph_block td.pad > div {
                font-size: 12px !important;
              }

              .row-bottom-footer .column-1 .block-2.paragraph_block td.pad > div,
              .row-bottom-footer .column-1 .block-4.paragraph_block td.pad > div {
                font-size: 12px !important;
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
              class="row row-1"
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
                        background-color: #fff;
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
                                    <div style="max-width: 120px">
                                      <img
                                        src="https://9b9bd796c4.imgdist.com/pub/bfra/q6hiwcjj/t4a/ceu/etb/logo.png"
                                        style="
                                          display: block;
                                          height: auto;
                                          border: 0;
                                          width: 100%;
                                        "
                                        width="120"
                                        alt
                                        title
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
                        padding: 40px 20px;
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
                              padding-bottom: 5px;
                              padding-top: 5px;
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
                                    <div style="max-width: 336px">
                                      <img
                                        src="https://a84f1dc0df.imgdist.com/pub/bfra/clk2zyb1/elx/led/kz2/Refund-Confirm-money-transfer-4.png"
                                        style="
                                          display: block;
                                          height: auto;
                                          border: 0;
                                          width: 100%;
                                        "
                                        width="336"
                                        alt
                                        title
                                        height="auto"
                                      />
                                    </div>
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
                                <td class="pad" style="padding-bottom: 15px">
                                  <div
                                    style="
                                      color: #4e4e4e;
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 26px;
                                      font-weight: 700;
                                      line-height: 1.2;
                                      text-align: center;
                                      mso-line-height-alt: 31px;
                                    "
                                  >
                                    <p
                                      style="margin: 0; word-break: break-word"
                                    >
                                      Hi
                                      <span
                                        style="
                                          word-break: break-word;
                                          color: #16a34a;
                                        "
                                        >${customerInfo.customerName}!</span
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
                                <td class="pad">
                                  <div
                                    style="
                                      color: #555555;
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 16px;
                                      font-weight: 400;
                                      line-height: 1.2;
                                      text-align: center;
                                      mso-line-height-alt: 19px;
                                    "
                                  >
                                    <p
                                      style="margin: 0; word-break: break-word"
                                    >
                                      <strong
                                        >We have received your return request
                                        for order
                                        <span
                                          style="
                                            word-break: break-word;
                                            color: #16a34a;
                                          "
                                          >#${orderNumber}</span
                                        >&nbsp;and we’re happy to let you know
                                        that it has been approved!</strong
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
                                <td class="pad" style="padding-bottom: 5px">
                                  <div
                                    style="
                                      color: #555555;
                                      direction: ltr;
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 16px;
                                      font-weight: 400;
                                      letter-spacing: 0px;
                                      line-height: 1.2;
                                      text-align: left;
                                      mso-line-height-alt: 19px;
                                    "
                                  >
                                    <p style="margin: 0">
                                      <strong>Refund Details:</strong>
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table
                              class="list_block block-2"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                                word-break: break-word;
                                color: #555555;
                                direction: ltr;
                                font-family: 'Trebuchet MS', 'Lucida Grande',
                                  'Lucida Sans Unicode', 'Lucida Sans', Tahoma,
                                  sans-serif;
                                font-size: 16px;
                                font-weight: 400;
                                letter-spacing: 0px;
                                line-height: 1.2;
                                text-align: left;
                                mso-line-height-alt: 19px;
                              "
                            >
                              <tr>
                                <td class="pad" style="padding-bottom: 10px">
                                  <div style="margin-left: -20px">
                                    <ul
                                      start="1"
                                      style="
                                        margin-top: 0;
                                        margin-bottom: 0;
                                        list-style-type: revert;
                                      "
                                    >
                                      <li style="margin: 0 0 0 0">
                                        <strong>
                                          Amount Refunded: ৳ ${returnInfo.refundAmount.toFixed(
                                            2
                                          )}
                                          </strong>
                                      </li>
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table
                              class="list_block block-3"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                                word-break: break-word;
                                color: #555555;
                                direction: ltr;
                                font-family: 'Trebuchet MS', 'Lucida Grande',
                                  'Lucida Sans Unicode', 'Lucida Sans', Tahoma,
                                  sans-serif;
                                font-size: 16px;
                                font-weight: 400;
                                letter-spacing: 0px;
                                line-height: 1.2;
                                text-align: left;
                                mso-line-height-alt: 19px;
                              "
                            >
                              <tr>
                                <td class="pad" style="padding-bottom: 10px">
                                  <div style="margin-left: -20px">
                                    <ul
                                      start="1"
                                      style="
                                        margin-top: 0;
                                        margin-bottom: 0;
                                        list-style-type: revert;
                                      "
                                    >
                                      <li style="margin: 0 0 0 0">
                                        <strong>
                                          Payment Method: ${
                                            paymentInfo.paymentMethod
                                          }
                                          </strong>
                                      </li>
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table
                              class="list_block block-4"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                                word-break: break-word;
                                color: #555555;
                                direction: ltr;
                                font-family: 'Trebuchet MS', 'Lucida Grande',
                                  'Lucida Sans Unicode', 'Lucida Sans', Tahoma,
                                  sans-serif;
                                font-size: 16px;
                                font-weight: 400;
                                letter-spacing: 0px;
                                line-height: 1.2;
                                text-align: left;
                                mso-line-height-alt: 19px;
                              "
                            >
                              <tr>
                                <td class="pad" style="padding-bottom: 15px">
                                  <div style="margin-left: -20px">
                                    <ul
                                      start="1"
                                      style="
                                        margin-top: 0;
                                        margin-bottom: 0;
                                        list-style-type: revert;
                                      "
                                    >
                                      <li style="margin: 0 0 0 0">
                                        <strong>
                                          Refund Processed Date: ${
                                            returnInfo.refundProcessedDate
                                          }
                                          </strong>
                                      </li>
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table
                              class="paragraph_block block-5"
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
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 16px;
                                      font-weight: 700;
                                      line-height: 1.5;
                                      text-align: left;
                                      mso-line-height-alt: 24px;
                                    "
                                  >
                                    <p style="margin: 0">
                                      The refunded amount should reflect in your account/wallet within 3-10 business days, depending on your bank or payment provider.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table
                              class="paragraph_block block-6"
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
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 16px;
                                      line-height: 1.5;
                                      text-align: left;
                                      mso-line-height-alt: 24px;
                                    "
                                  >
                                    <p style="margin: 0">
                                      If you have any questions or need further assistance, feel free to contact us. We’re always here to help!
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table
                              class="paragraph_block block-6"
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
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 16px;
                                      line-height: 1.5;
                                      text-align: left;
                                      mso-line-height-alt: 24px;
                                    "
                                  >
                                    <p style="margin: 0">
                                      Thank you for shopping with us!
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table
                              class="paragraph_block block-7"
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
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 16px;
                                      line-height: 1.5;
                                      text-align: left;
                                      mso-line-height-alt: 24px;
                                    "
                                  >
                                    <p style="margin: 0">Stay Posh</p>
                                    <p style="margin: 0">PoshaX Team</p>
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
                    class="row row-top-footer"
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
                    class="row row-bottom-footer"
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
                                                      process.env.COMPANY_NAME
                                                    } Facebook"
                                                    title="${
                                                      process.env.COMPANY_NAME
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
                                                      process.env.COMPANY_NAME
                                                    } Instagram"
                                                    title="${
                                                      process.env.COMPANY_NAME
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
                                                      process.env.COMPANY_NAME
                                                    } Twitter"
                                                    title="${
                                                      process.env.COMPANY_NAME
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
                                                      process.env.COMPANY_NAME
                                                    } TikTok"
                                                    title="${
                                                      process.env.COMPANY_NAME
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
                                                }/help"
                                                target="_blank"
                                                rel="noopener"
                                                ><strong>Help Center</strong></a
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
  </html>
    `,
  };
};
