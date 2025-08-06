const getAbandonedCartEmailOptions = (email, fullName, cartItems) => {
  const options = {
    from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `[${process.env.COMPANY_NAME}] You left your order incomplete!`,
    text: `HI ${fullName.toUpperCase()}!

      Looks like you left these items in your cart.

      ${cartItems
        .map((item) => {
          const priceLine = item.originalPrice
            ? `৳ ${item.originalPrice} → ৳ ${item.price}`
            : `৳ ${item.price}`;
          return `${item.title}\nPrice: ${priceLine}\nSize: ${
            item.size
          }\nColor: ${item.color.name}\nView: ${item.pageUrl}\n\nQuantity: ${
            item.quantity
          }\n\nTotal Price: ${item.price * item.quantity}`;
        })
        .join("\n\n\n")}

      Complete your purchase: ${process.env.MAIN_DOMAIN_URL}/checkout
      
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

              .row-3 .column-1 .block-2.paragraph_block td.pad > div {
                font-size: 22px !important;
              }

              .row-3 .column-1 .block-3.paragraph_block td.pad > div {
                font-size: 14px !important;
              }

              .row-4 .column-1 .block-1.paragraph_block td.pad > div,
              .row-4 .column-2 .block-1.paragraph_block td.pad > div,
              .row-4 .column-3 .block-1.paragraph_block td.pad > div {
                font-size: 12px !important;
              }
              
              ${cartItems
                .map(
                  (_, index) => `.row-${
                    5 + index
                  } .column-3 .block-1.paragraph_block td.pad > div,
              .row-${
                5 + index
              } .column-4 .block-1.paragraph_block td.pad > div {
                font-size: 12px !important;
              }`
                )
                .join("\n\n")}

              ${cartItems
                .map(
                  (_, index) => `.row-${
                    5 + index
                  } .column-2 .block-1.paragraph_block td.pad > div {
                font-size: 12px !important;
              }`
                )
                .join("\n\n")}

              ${cartItems
                .map(
                  (_, index) => `.row-${
                    5 + index
                  } .column-2 .block-2.paragraph_block td.pad > div {
                font-size: 11px !important;
              }`
                )
                .join("\n\n")}

              .row-${
                5 + cartItems.length
              } .column-1 .block-1.button_block span {
                font-size: 14px !important;
                line-height: 28px !important;
              }

              .row-4 .row-content {
                padding: 15px 10px !important;
              }

              ${cartItems
                .map(
                  (_, index) => `.row-${5 + index} .row-content {
                padding-top: 10px !important;
                padding-left: 10px !important;
                padding-right: 10px !important;
              }`
                )
                .join("\n\n")}

              ${cartItems
                .map(
                  (_, index) => `.row-${5 + index} .column-2 {
                padding: 0 0 0 10px !important;
              }`
                )
                .join("\n\n")}

              .row-${5 + cartItems.length} .column-1 {
                padding: 20px 0 !important;
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
                                                  process.env.COMPANY_NAME
                                                } Logo"
                                                title="${
                                                  process.env.COMPANY_NAME
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
                  <table
                    class="row row-3"
                    align="center"
                    width="100%"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                    style="
                      mso-table-lspace: 0pt;
                      mso-table-rspace: 0pt;
                      background-size: auto;
                    "
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
                              background-size: auto;
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
                                    padding-bottom: 60px;
                                    padding-left: 20px;
                                    padding-right: 20px;
                                    padding-top: 40px;
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
                                          padding-bottom: 15px;
                                          width: 100%;
                                          padding-right: 0px;
                                          padding-left: 0px;
                                        "
                                      >
                                        <div class="alignment" align="center">
                                          <div
                                            class="fullWidth"
                                            style="max-width: 336px"
                                          >
                                            <img
                                              src="https://9b9bd796c4.imgdist.com/pub/bfra/q6hiwcjj/4vk/8vj/5ph/order-confirmed-1-29.png"
                                              style="
                                                display: block;
                                                height: auto;
                                                border: 0;
                                                width: 100%;
                                              "
                                              width="336"
                                              alt="Item kept in cart"
                                              title="Items kept in cart"
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
                                      <td class="pad" style="padding-bottom: 10px">
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
                                            <strong
                                              ><span style="word-break: break-word"
                                                >HI
                                                <span
                                                  style="
                                                    word-break: break-word;
                                                    color: #29972d;
                                                  "
                                                  >${fullName.toUpperCase()}!</span
                                                ></span
                                              ></strong
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
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 19px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            Looks like you left these items in your
                                            cart.
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
                            class="row-content"
                            align="center"
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              background-color: #f8f8f8;
                              color: #333;
                              padding: 15px;
                              width: 650px;
                              margin: 0 auto;
                            "
                            width="650"
                          >
                            <tbody>
                              <tr>
                                <td
                                  class="column column-1"
                                  width="75%"
                                  style="
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    font-weight: 400;
                                    text-align: left;
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
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 19px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <strong>ITEM</strong>
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td
                                  class="column column-2"
                                  width="8.333333333333334%"
                                  style="
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    font-weight: 400;
                                    text-align: left;
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
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 19px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <strong>QTY</strong>
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td
                                  class="column column-3"
                                  width="16.666666666666668%"
                                  style="
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    font-weight: 400;
                                    text-align: left;
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
                                      <td class="pad">
                                        <div
                                          style="
                                            color: #555555;
                                            font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                            font-size: 16px;
                                            line-height: 1.2;
                                            text-align: center;
                                            mso-line-height-alt: 19px;
                                          "
                                        >
                                          <p
                                            style="margin: 0; word-break: break-word"
                                          >
                                            <strong>PRICE</strong>
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
                  ${cartItems
                    .map(
                      (item, index) =>
                        `<table
                      class="row row-${5 + index}"
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
                                border-radius: 0;
                                color: #333;
                                padding-top: 15px;
                                padding-left: 15px;
                                padding-right: 15px;
                                width: 650px;
                                margin: 0 auto;
                              "
                              width="650"
                            >
                              <tbody>
                                <tr>
                                  <td
                                    class="column column-1"
                                    width="25%"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      font-weight: 400;
                                      text-align: left;
                                      background-color: #f0f0f0;
                                      vertical-align: middle;
                                      border-radius: 4px;
                                    "
                                  >
                                    <a
                                      href="${item.pageUrl}"
                                      target="_blank"
                                      style="text-decoration: none"
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
                                              <table role="presentation" width="100%" style="height: 130px;">
                                                <tr>
                                                  <td align="center" valign="middle" style="height: 130px;">
                                                    <img src="${item.imageUrl}" 
                                                      style="display: block; max-width: 100%; max-height: 100%; height: auto; width: auto; border: 0;" 
                                                      alt="${item.title}" 
                                                      title="${item.title}" />
                                                  </td>
                                                </tr>
                                              </table>
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                    </a>
                                  </td>
                                  <td
                                    class="column column-2"
                                    width="50%"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      font-weight: 400;
                                      text-align: left;
                                      padding-left: 15px;
                                      vertical-align: middle;
                                      border-radius: 4px;
                                    "
                                  >
                                    <a
                                      href="${item.pageUrl}"
                                      target="_blank"
                                      style="text-decoration: none"
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
                                                color: #29972d;
                                                font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                                font-size: 18px;
                                                line-height: 1;
                                                text-align: left;
                                                mso-line-height-alt: 18px;
                                              "
                                            >
                                              <p
                                                style="margin: 0; word-break: break-word"
                                              >
                                                <strong>${item.title}</strong>
                                              </p>
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                    </a>
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
                                              color: #888888;
                                              font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                              font-size: 14px;
                                              line-height: 1.4;
                                              text-align: left;
                                              mso-line-height-alt: 20px;
                                            "
                                          >
                                            <p
                                              style="margin: 0; word-break: break-word"
                                            >
                                              Price:
                                              ${
                                                item.originalPrice
                                                  ? `<span style="text-decoration: line-through; color: #777777;">৳ ${item.originalPrice.toLocaleString()}</span> `
                                                  : ""
                                              }
                                              ৳ ${item.price.toLocaleString()}<br />Size: ${
                          item.size
                        }<br />Color: <span
                                                  style="
                                                    display: inline-block;
                                                    vertical-align: middle;
                                                    width: 14px;
                                                    height: 14px;
                                                    background-color: ${
                                                      item.color.code
                                                    };
                                                    border-radius: 50%;
                                                    margin-right: 2px;
                                                  "
                                                ></span>
                                                ${item.color.name}
                                            </p>
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                  <td
                                    class="column column-3"
                                    width="8.333333333333334%"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      font-weight: 400;
                                      text-align: left;
                                      vertical-align: middle;
                                      border-radius: 4px;
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
                                        <td class="pad">
                                          <div
                                            style="
                                              color: #555555;
                                              font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                              font-size: 16px;
                                              line-height: 1.2;
                                              text-align: center;
                                              mso-line-height-alt: 22px;
                                            "
                                          >
                                            <p
                                              style="margin: 0; word-break: break-word"
                                            >
                                              <span style="word-break: break-word"
                                                ><strong>${
                                                  item.quantity
                                                }</strong></span
                                              >
                                            </p>
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                  <td
                                    class="column column-4"
                                    width="16.666666666666668%"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                      font-weight: 400;
                                      text-align: left;
                                      vertical-align: middle;
                                      border-radius: 4px;
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
                                        <td class="pad">
                                          <div
                                            style="
                                              color: #555555;
                                              font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                              font-size: 16px;
                                              letter-spacing: 0px;
                                              line-height: 1.2;
                                              text-align: center;
                                              mso-line-height-alt: 22px;
                                            "
                                          >
                                            <p
                                              style="margin: 0; word-break: break-word"
                                            >
                                              <span style="word-break: break-word"
                                                ><strong> ৳ ${(
                                                  item.price * item.quantity
                                                ).toLocaleString()}</strong></span
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
                    </table>`
                    )
                    .join("")}
                  <table
                    class="row row-${5 + cartItems.length}"
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
                                    padding-bottom: 30px;
                                    padding-top: 30px;
                                    vertical-align: top;
                                  "
                                >
                                  <table
                                    class="button_block block-1"
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
                                      <td class="pad" style="text-align: center">
                                        <div class="alignment" align="center">
                                          <a
                                            href="${
                                              process.env.MAIN_DOMAIN_URL
                                            }/checkout"
                                            target="_blank"
                                            style="
                                              color: #ffffff;
                                              text-decoration: none;
                                            "
                                              ><!--[if mso]>
                                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="#"  style="height:42px;width:222px;v-text-anchor:middle;" arcsize="10%" fillcolor="#29972d">
                                              <v:stroke dashstyle="Solid" weight="0px" color="#29972d"/>
                                              <w:anchorlock/>
                                              <v:textbox inset="0px,0px,0px,0px">
                                              <center dir="false" style="color:#ffffff;font-family:'Trebuchet MS', Arial, Helvetica, sans-serif;font-size:16px">
                                              <!
                                              [endif]--><span
                                              class="button"
                                              style="
                                                background-color: #29972d;
                                                border-bottom: 0px solid transparent;
                                                border-left: 0px solid transparent;
                                                border-radius: 4px;
                                                border-right: 0px solid transparent;
                                                border-top: 0px solid transparent;
                                                color: #ffffff;
                                                display: inline-block;
                                                font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif;
                                                font-size: 16px;
                                                font-weight: undefined;
                                                mso-border-alt: none;
                                                padding-bottom: 5px;
                                                padding-top: 5px;
                                                padding-left: 20px;
                                                padding-right: 20px;
                                                text-align: center;
                                                width: auto;
                                                word-break: keep-all;
                                                letter-spacing: normal;
                                              "
                                              ><span style="word-break: break-word"
                                                ><span
                                                  style="
                                                    word-break: break-word;
                                                    line-height: 32px;
                                                  "
                                                  data-mce-style
                                                  ><strong
                                                    >Complete your purchase</strong
                                                  ></span
                                                ></span
                                              ></span
                                            ><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a</a
                                          >
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

module.exports = getAbandonedCartEmailOptions;
