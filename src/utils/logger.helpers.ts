export const infoLog = (data: any, message?: string) => {
  console.info(message || '', { data });
};

export const errorLog = (error?: any, message?: string) => {
  console.error(message || '', { error });
};
