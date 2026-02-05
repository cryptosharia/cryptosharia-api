# 🚀 Integrasi CryptoSharia API

Untuk integrasi CryptoSharia API, kita menggunakan pendekatan **Contract-First**. Artinya, dokumentasi API dan TypeScript types kita selalu sinkron. Kita tidak menulis _fetcher_ atau _types_ secara manual, melainkan semuanya di-generate otomatis.

## 1. Dokumentasi

Dokumentasi API (Scalar) bisa diakses di:

- Preview: [https://preview.api.cryptosharia.id](https://preview.api.cryptosharia.id)
- Local: [http://localhost:5173](http://localhost:5173)

Gunakan ini untuk melihat _endpoints_, parameters yang dibutuhkan, struktur responses, dll.

---

## 2. Install Dependencies

Pertama, install library yang dibutuhkan ke dalam project kalian:

```bash
npm install -D openapi-typescript
npm install openapi-fetch
```

## 3. Update Types

Untuk memulai, buka file `package.json` di project kalian dan tambahkan script berikut:

```json
"scripts": {
  "gen:api-types": "openapi-typescript http://localhost:5173/openapi.json -o src/lib/api-types.ts",
  "gen:api-types:preview": "openapi-typescript https://preview.api.cryptosharia.id/openapi.json -o src/lib/api-types.ts"
}
```

Script ini akan mengupdate `src/lib/api-types.ts`, yang menjadi _source of truth_ untuk semua requests dan responses API.

### Opsi A: Preview Environment

Jika kalian tidak ingin menjalankan full backend di lokal, maka bisa langsung generate TypeScript types-nya berdasarkan _OpenAPI Spec_ yang ada di Preview Environment:

```bash
npm run gen:api-types:preview
```

### Opsi B: Local Development Environment

Jika kalian ingin menjalankan full backend di lokal, maka bisa generate TypeScript types-nya berdasarkan _OpenAPI Spec_ yang ada di Local Environment:

1.  **Clone Repo CryptoSharia API**:

    ```bash
    git clone https://github.com/cryptosharia/cryptosharia-api.git
    cd cryptosharia-api
    ```

2.  **Buat Network**:
    Karena kita berbagi network antar project, kalian harus membuat network-nya:

    ```bash
    docker network create cryptosharia-net
    ```

3.  **Jalankan Service**:

    ```bash
    docker compose up
    # atau
    docker compose up -d # untuk jalan di background
    ```

4.  **Generate Types** (Di project kalian):
    ```bash
    npm run gen:api-types
    ```

---

## 4. Setup Client

Kita menggunakan `openapi-fetch`. Library ini ringan dan fully _type-safe_.

```typescript
// Ini diambil dari `.env` file project kalian!
import { CS_API_URL, CS_API_KEY } from '$env/static/private';
import createClient from 'openapi-fetch';
import type { paths } from '$lib/api-types';

const client = createClient<paths>({
	baseUrl: CS_API_URL,
	headers: {
		'Api-Key': CS_API_KEY
	}
});
```

---

## 5. Melakukan Request

### Contoh GET Request

```typescript
// data: Berisi jika response code = 2xx; jika tidak maka `undefined`
// error: Berisi jika response code = 4xx atau 5xx; jika tidak maka `undefined`
// response: Original Response object (status, headers, etc.)
const { data, error, response } = await client.GET('/posts', {
	params: {
		query: {
			sections: ['news', 'activity'], // Fully typed enum!
			limit: 5,
			search: 'CryptoSharia to the MOON'
		}
	}
});

if (error) {
	console.error('Waduh!', error);
}

if (data) {
	console.log(data.data);
}
```

---

## 6. Pro-Tips

- **Type Safety**: Jika kalian mencoba menggunakan parameter yang tidak ada, atau mengirim angka padahal yang diminta itu string, **TypeScript akan langsung ngamuk sebelum kode dijalankan**.
- **Error Handling**: `openapi-fetch` nge-return `data` dan `error`. Jadi tidak perlu pakai `try/catch` yang ribet hanya untuk sekadar nge-handle error 4xx/5xx.
- **Enums**: Cek tipe data untuk field yang menggunakan Enum. Itu _strictly typed_, jadi tidak boleh ada typo!

Selamat ngoding! 🚀
