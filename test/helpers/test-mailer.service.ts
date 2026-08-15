export class TestMailerService {
  // The test double captures emails in memory so E2E tests never contact a mail provider.
  readonly messages: { to: string; subject: string; html: string }[] = [];

  send(input: { to: string; subject: string; html: string }) {
    this.messages.push(input);
    return Promise.resolve();
  }

  clear() {
    this.messages.length = 0;
  }
}
