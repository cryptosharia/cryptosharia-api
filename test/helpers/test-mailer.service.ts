export class TestMailerService {
  readonly messages: { to: string; subject: string; html: string }[] = [];

  send(input: { to: string; subject: string; html: string }) {
    this.messages.push(input);
    return Promise.resolve();
  }

  clear() {
    this.messages.length = 0;
  }
}
