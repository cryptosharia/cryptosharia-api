type UploadInput = {
  pathname: string;
  file: Blob;
  contentType?: string;
};

const defaultUpload = (input: UploadInput) => ({
  url: `https://blob.example.com/${input.pathname}`,
  pathname: input.pathname,
});

export class TestStorageService {
  upload = vi.fn(defaultUpload);
  delete = vi.fn(() => undefined);
  getPublicUrl = vi.fn(
    (pathname: string) =>
      `https://blob.example.com/${pathname.replace(/^\/+/, '')}`,
  );

  reset() {
    this.upload.mockReset().mockImplementation(defaultUpload);
    this.delete.mockReset().mockImplementation(() => undefined);
    this.getPublicUrl
      .mockReset()
      .mockImplementation(
        (pathname: string) =>
          `https://blob.example.com/${pathname.replace(/^\/+/, '')}`,
      );
  }
}
