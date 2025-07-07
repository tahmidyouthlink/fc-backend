function getImageSetsBasedOnColors(productVariants) {
  if (!productVariants?.length) return;

  const colorImageMap = {};

  productVariants.forEach(({ color, imageUrls }) => {
    const colorId = color._id.toString();

    if (!colorImageMap[colorId]) {
      colorImageMap[colorId] = {
        color: color,
        images: new Set(imageUrls),
      };
    } else {
      imageUrls.forEach((url) => colorImageMap[colorId].images.add(url));
    }
  });

  return Object.values(colorImageMap).map(({ color, images }) => ({
    color,
    images: Array.from(images),
  }));
}

module.exports = getImageSetsBasedOnColors;
