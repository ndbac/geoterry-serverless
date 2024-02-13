import { errorLog, infoLog } from './utils/logger.helpers';
import type { S3Event } from 'aws-lambda';
import { ACCEPTED_SIZES } from './utils/constants';
import { resizeImageAndUploadToS3 } from './utils/resize.helpers';
import { convertSizeToString } from './utils/helpers';

export const triggerResizeImageToS3 = async (event: S3Event) => {
  try {
    infoLog(event, 'Start resizing image');
    await Promise.allSettled(
      event.Records.map(async (record) => {
        const paths = record.s3.object.key.split('/');
        const filename = paths.pop();
        infoLog({ paths, filename }, 'Resizing image');
        paths.pop();
        await Promise.allSettled(
          ACCEPTED_SIZES.map(async (size) => {
            return resizeImageAndUploadToS3({
              objectKey: record.s3.object.key,
              resizeOptions: size,
              uploadKey: paths
                .concat(convertSizeToString(size), filename || '')
                .join('/')
            });
          })
        );
      })
    );
    infoLog(event, 'End resizing image');
  } catch (error) {
    errorLog(error, 'Error when resizing image');
    throw error;
  }
};
