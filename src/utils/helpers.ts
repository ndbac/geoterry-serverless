import { ACCEPTED_SIZES } from './constants';
import { Readable } from 'stream';

export const parseQueryString = (queryString: {
  limit?: string;
  w?: string;
  h?: string;
}) => {
  const { w, h, limit } = queryString;
  return {
    width: w ? parseInt(w || '0', 10) : undefined,
    height: h ? parseInt(h || '0', 10) : undefined,
    limit: limit ? parseFloat(limit || '0') * 1000000 : undefined
  };
};

export const convertSizeToString = (size: (typeof ACCEPTED_SIZES)[number]) => {
  return (size.width || '') + 'x' + (size.height || '');
};

export const streamToBuffer = (stream: Readable) => {
  return new Promise<Buffer>((resolve, reject) => {
    const data: Buffer[] = [];

    stream.on('data', (chunk) => {
      data.push(chunk);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(data));
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
};

export const streamToBase64String = async (stream: Readable) => {
  const buffer = await streamToBuffer(stream);
  return buffer.toString('base64');
};

export const removeLastExtension = (filename: string) => {
  let removedExt: string | undefined = undefined;
  const parts = filename.split('.');
  if (parts.length > 2) {
    removedExt = parts.pop();
  }
  return {
    filename: parts.join('.'),
    removedExt
  };
};
