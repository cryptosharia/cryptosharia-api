# CryptoSharia API

**CryptoSharia API** is the robust backend engine and core logic provider for the entire **CryptoSharia** ecosystem.

## Tech Stack

- **API documentation:** OpenAPI 3.2.0 and [Scalar](https://scalar.com/)
- **Runtime and package manager:** [Bun](https://bun.sh/)
- **Framework:** [NestJS](https://nestjs.com/) with [Fastify](https://fastify.dev/)
- **Databases:** [PostgreSQL](https://www.postgresql.org/) and [Redis](https://redis.io/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Data Validation:** [Zod](https://zod.dev/)
- **Storage:** [Vercel Blob](https://vercel.com/storage/blob)
- **Image hosting:** [ImgBB](https://imgbb.com/)
- **Email delivery:** [Resend](https://resend.com/)
- **Crypto Market data:** [CoinMarketCap](https://coinmarketcap.com/)
- **Testing:** [Vitest](https://vitest.dev/)

## Local Development

```bash
cp .env.example .env
docker compose up
```

The API listens on `http://localhost:3000` by default. Set `PORT` in `.env` to use another port.

## Contact

For any questions or feedback, please contact [Daffa Ilhami](https://mdaffailhami.my.id/)
