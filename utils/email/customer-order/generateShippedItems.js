const generateShippedItemsHTML = (productInformation = []) => {
  return productInformation
    .map(
      (item) => `
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
                            width="25%"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              font-weight: 400;
                              text-align: left;
                              border-right: 1px solid #efefef;
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
                                    <div style="max-width: 113px">
                                      <img
                                        src="${item.thumbnailImgUrl}"
                                        style="
                                          display: block;
                                          height: auto;
                                          border: 0;
                                          width: 100%;
                                        "
                                        width="113"
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
                          <td
                            class="column column-2"
                            width="25%"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              font-weight: 400;
                              text-align: left;
                              border-right: 1px dotted #e8e8e8;
                              padding-bottom: 35px;
                              padding-top: 30px;
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
                                <td
                                  class="pad"
                                  style="
                                    padding-bottom: 5px;
                                    padding-right: 10px;
                                    padding-top: 10px;
                                  "
                                >
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
                                      <span
                                        style="
                                          word-break: break-word;
                                          color: #16a34a;
                                        "
                                        ><strong>${
                                          item.productTitle
                                        }</strong></span
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
                                <td
                                  class="pad"
                                  style="
                                    padding-bottom: 10px;
                                    padding-right: 10px;
                                  "
                                >
                                  <div
                                    style="
                                      color: #555555;
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 14px;
                                      font-weight: 400;
                                      line-height: 1.2;
                                      text-align: center;
                                      mso-line-height-alt: 17px;">
                                    
                                    <p style="margin: 0; word-break: break-word">
                                    ${item.color.value} - ${item.size}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td
                            class="column column-3"
                            width="25%"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              font-weight: 400;
                              text-align: left;
                              border-right: 1px dotted #e8e8e8;
                              padding-bottom: 5px;
                              padding-top: 55px;
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
                                <td
                                  class="pad"
                                  style="
                                    padding-bottom: 10px;
                                    padding-left: 10px;
                                    padding-right: 10px;
                                  "
                                >
                                  <div
                                    style="
                                      color: #555555;
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 18px;
                                      font-weight: 700;
                                      line-height: 1.2;
                                      text-align: center;
                                      mso-line-height-alt: 22px;
                                    "
                                  >
                                    <p
                                      style="margin: 0; word-break: break-word"
                                    >
                                      <span style="word-break: break-word"
                                        ><strong>${item.sku}</strong></span
                                      >
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <div
                              class="spacer_block block-2"
                              style="
                                height: 50px;
                                line-height: 50px;
                                font-size: 1px;
                              "
                            >
                              &#8202;
                            </div>
                          </td>
                          <td
                            class="column column-4"
                            width="25%"
                            style="
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              font-weight: 400;
                              text-align: left;
                              padding-bottom: 5px;
                              padding-top: 55px;
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
                                <td class="pad" style="padding-right: 15px">
                                  <div
                                    style="
                                      color: #555555;
                                      font-family: 'Trebuchet MS',
                                        'Lucida Grande', 'Lucida Sans Unicode',
                                        'Lucida Sans', Tahoma, sans-serif;
                                      font-size: 18px;
                                      font-weight: 400;
                                      line-height: 1.2;
                                      text-align: center;
                                      mso-line-height-alt: 22px;
                                    "
                                  >
                                    <p
                                      style="margin: 0; word-break: break-word"
                                    >
                                      ${(item?.discountInfo
                                        ? item?.discountInfo
                                            .finalPriceAfterDiscount * item?.sku
                                        : item?.regularPrice * item?.sku
                                      ).toFixed(2)}
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
`
    )
    .join("");
};

const generateShippedItemsText = (productInformation = []) => {
  return productInformation
    .map((item, index) => {
      const totalPrice = item?.discountInfo
        ? item.discountInfo.finalPriceAfterDiscount * item.sku
        : item.regularPrice * item.sku;

      return `Item ${index + 1}:
- Product: ${item.productTitle}
- Color: ${item.color?.value}
- Size: ${item.size}
- Quantity: ${item.sku}
- Price: ${totalPrice.toFixed(2)} BDT
`;
    })
    .join("\n");
};

module.exports = { generateShippedItemsHTML, generateShippedItemsText };
