type UploadInput = {
  file: Blob;
  filename: string;
  contentType: string;
};

const defaultUpload = (input: UploadInput) => ({
  providerId: 'imgbb-test-id',
  title: input.filename,
  url: 'https://i.ibb.co/test-image.png',
  width: 1200,
  height: 800,
  size: input.file.size,
  filename: input.filename,
  mimeType: input.contentType,
  deleteUrl: 'https://ibb.co/delete/imgbb-test-id',
});

export class TestImageProviderService {
  upload = vi.fn(defaultUpload);

  reset() {
    this.upload.mockReset().mockImplementation(defaultUpload);
  }
}
