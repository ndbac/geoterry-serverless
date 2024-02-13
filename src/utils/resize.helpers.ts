import sharp from 'sharp';
import { IResizeOptions, ISize } from '../types';
import {
  ALLOWED_EXTENSIONS_TO_CONVERT,
  AWS_LAMBDA_LIMIT,
  EImageExtension,
  ALLOWED_EXTENSIONS_TO_CONVERT_TO
} from './constants';
import { getObject, getObjectSize, uploadToS3 } from './s3.helpers';
import convert from 'heic-convert';

export const resizeImage = async (
  original: Buffer,
  options: IResizeOptions
) => {
  let { width } = options;
  const { height, resizePercentage } = options;

  const image = sharp(original, { failOnError: false });

  if (resizePercentage && resizePercentage > 0) {
    const dimensions = await getDimensions(image);
    width = Math.floor(dimensions.width * resizePercentage);
  }

  return image.resize(width, height).withMetadata().toBuffer();
};

export const resizeImageAndUploadToS3 = async (options: {
  objectKey: string;
  uploadKey: string;
  resizeOptions: ISize;
  convertToExt?: string;
}) => {
  const { objectKey, resizeOptions, uploadKey, convertToExt } = options;
  const { original, isResizable } = await getOriginalImageToProcess(
    objectKey,
    convertToExt
  );

  const imageType = getImageType(objectKey);
  let resizedImage = original;
  let imageAsBase64 = original.toString('base64');

  if (isResizable) {
    resizedImage = await resizeImage(original, resizeOptions);
    imageAsBase64 = resizedImage.toString('base64');
  }

  if (
    convertToExt &&
    !isResizable &&
    ALLOWED_EXTENSIONS_TO_CONVERT_TO.includes(convertToExt.toLowerCase()) &&
    ALLOWED_EXTENSIONS_TO_CONVERT.includes(imageType.toLowerCase())
  ) {
    const convertedImage = await convertImageExt(
      resizedImage,
      convertToExt.toLowerCase()
    );

    if (convertedImage) {
      imageAsBase64 = convertedImage.toString('base64');
      const uploadKey = `${objectKey}.${convertToExt.toLowerCase()}`;
      await uploadToS3({
        body: convertedImage,
        key: uploadKey
      });
    }
  }

  if (isResizable) {
    await uploadToS3({
      body: resizedImage,
      key: uploadKey
    });
  }

  return formatResponse(imageAsBase64);
};

export const resizeImageByLimit = async (options: {
  objectKey: string;
  limit: number;
}) => {
  const { objectKey } = options;
  // Set limit to max of 5mb because AWS lambda can't handle sending more than that
  const limit = Math.min(options.limit, AWS_LAMBDA_LIMIT);
  const original = await getObject(objectKey);

  const defaultResponse = formatResponse(original.toString('base64'));

  const responseSize = Buffer.byteLength(
    JSON.stringify(defaultResponse),
    'utf-8'
  );
  const originalSize = (await getObjectSize(objectKey)) || 0;
  const size = Math.max(originalSize, responseSize);

  if (size < limit) {
    return defaultResponse;
  }

  // Add 3% allowance
  const resizePercentage = (limit / size) * 0.97;
  const resizedImage = await resizeImage(original, { resizePercentage });

  return formatResponse(resizedImage.toString('base64'));
};

const getDimensions = async (image: sharp.Sharp) => {
  const metadata = await image.metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0
  };
};

const formatResponse = (body: string) => ({
  statusCode: 200,
  body,
  isBase64Encoded: true,
  headers: {
    'Content-Type': 'image/*'
  }
});

const getOriginalImageToProcess = async (
  objectKey: string,
  convertToExt?: string
) => {
  let original: Buffer;
  let isResizable = false;
  try {
    if (convertToExt) {
      original = await getObject(`${objectKey}.${convertToExt}`);
    } else {
      original = await getObject(objectKey);
    }
    isResizable = true;
  } catch (error) {
    original = await getObject(objectKey);
  }
  return {
    original,
    isResizable
  };
};

export const convertImageExt = async (
  image: Buffer,
  ext?: string
): Promise<Buffer> => {
  const convertedImg = await convert({
    buffer: image,
    format: ext === EImageExtension.PNG ? 'PNG' : 'JPEG'
  });
  return Buffer.from(convertedImg);
};

export const getImageType = (objectKey: string): string => {
  const extension = objectKey.split('.').pop()?.toLowerCase() || '';
  return extension;
};
