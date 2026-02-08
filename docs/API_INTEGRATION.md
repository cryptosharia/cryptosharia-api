# 🚀 Integrasi CryptoSharia API

Untuk integrasi CryptoSharia API, kita menggunakan pendekatan **Contract-First**. Artinya, dokumentasi API dan TypeScript types kita selalu sinkron. Kita tidak menulis _fetcher_ atau _types_ secara manual, melainkan semuanya di-generate otomatis.

## 1. Dokumentasi

Dokumentasi API (Scalar) bisa diakses di:

- Preview: [https://preview.api.cryptosharia.id](https://preview.api.cryptosharia.id)
- Local: [http://localhost:5173](http://localhost:5173)

Gunakan ini untuk melihat _endpoints_, parameters yang dibutuhkan, struktur responses, dll.

---

## 2. Install Dependencies

Pertama, install library yang dibutuhkan ke dalam project:

```bash
npm install -D openapi-typescript
npm install openapi-fetch
```

## 3. Update Types

Untuk memulai, buka file `package.json` di project dan tambahkan script berikut:

```json
"scripts": {
  "gen:api-types": "openapi-typescript http://localhost:5173/openapi.json -o src/lib/api-types.ts",
  "gen:api-types:preview": "openapi-typescript https://preview.api.cryptosharia.id/openapi.json -o src/lib/api-types.ts"
}
```

Script ini akan men-generate `src/lib/api-types.ts`, yang menjadi _source of truth_ untuk semua requests dan responses API.

### Opsi A: Preview Environment

Jika tidak ingin menjalankan full backend di lokal, maka bisa langsung generate TypeScript types-nya berdasarkan _OpenAPI Spec_ yang ada di Preview Environment:

```bash
npm run gen:api-types:preview
```

### Opsi B: Local Development Environment

Jika ingin menjalankan full backend di lokal, maka bisa generate TypeScript types-nya berdasarkan _OpenAPI Spec_ yang ada di Local Environment:

1.  **Clone Repo CryptoSharia API**:

    ```bash
    git clone https://github.com/cryptosharia/cryptosharia-api.git
    cd cryptosharia-api
    ```

2.  **Buat Network**:
    Karena kita berbagi network antar project, maka kita harus membuat network-nya:

    ```bash
    docker network create cryptosharia-net
    ```

3.  **Jalankan Service**:

    ```bash
    docker compose up
    # atau
    docker compose up -d # untuk jalan di background
    ```

4.  **Generate Types** (Di project kita):
    ```bash
    npm run gen:api-types
    ```

---

## 4. Setup API Client

Kita menggunakan `openapi-fetch`. Library ini sangat ringan dan _fully type-safe_.

```typescript
// src/lib/api.ts
import createClient from 'openapi-fetch';
import type { paths } from '$lib/api-types';
import { PUBLIC_CS_API_URL } from '$env/static/public';

/**
 * Factory untuk membuat API Client.
 */
export const createApiClient = (
	options: {
		fetch?: typeof fetch;
		apiKey?: string;
	} = {}
) => {
	return createClient<paths>({
		baseUrl: PUBLIC_CS_API_URL,
		fetch: options.fetch,
		headers: options.apiKey ? { 'Api-Key': options.apiKey } : undefined
	});
};
```

---

## 5. Melakukan Request

Setiap kali melakukan request ke API, sangat disarankan menggunakan `fetch` bawaan SvelteKit dibanding native `fetch`.  
Berikut adalah beberapa kelebihan menggunakan `fetch` bawaan SvelteKit:

- **Credentialed Requests**: Secara otomatis mewarisi header `cookie` dan `authorization` dari request halaman saat berjalan di server.
- **Relative URLs**: Mendukung request relatif (seperti `/api/data`) saat di server, di mana biasanya native fetch mewajibkan URL absolut dengan origin.
- **Direct Internal Routing**: Request ke route internal (seperti `+server.js`) akan langsung memanggil fungsinya tanpa melalui _overhead_ jaringan HTTP.
- **SSR Serialization**: Selama SSR, SvelteKit merekam responnya dan memasukkannya langsung ke dalam HTML. Respon ini kemudian dibaca saat **Hidrasi** di browser, sehingga mencegah request jaringan kedua yang tidak perlu.

### 5.1 Contoh di Universal Load Function (`+page.ts`)

Fungsi `load` ini berjalan di **server-side** saat _initial load_ dan juga di **client-side** saat _navigation_.

> [!WARNING]
> Jangan panggil endpoint yang membutuhkan `Api-Key` langsung di sini, karena itu akan membocorkan API key ke publik. Untuk endpoint terproteksi, gunakan Proxy API (memanggil CryptoSharia API melalui server-side).

```typescript
// src/routes/posts/[slug]/+page.ts
import { createApiClient } from '$lib/api';

export const load = async ({ fetch, params }) => {
	// Memanggil endpoint publik (tidak butuh API Key)
	const client = createApiClient({ fetch });

	const { data } = await client.GET('/openapi.json', {});

	return { spec: data };
};
```

### 5.2 Contoh di Server-Side Load Function (`+page.server.ts`)

Fungsi `load` ini hanya berjalan di **server-side**, baik itu ketika _initial load_ ataupun saat _navigation_.

```typescript
// src/routes/posts/+page.server.ts
import { createApiClient } from '$lib/api';
import { CS_API_KEY } from '$env/static/private';

export const load = async ({ fetch }) => {
	// Di sini aman menggunakan CS_API_KEY karena file ini murni server-side
	const client = createApiClient({ fetch, apiKey: CS_API_KEY });

	const { data, error, response } = await client.GET('/posts', {
		params: { query: { limit: 5 } }
	});

	return { posts: data?.data ?? [] };
};
```

### 5.3 Contoh di Client-Side (Event Handler)

> [!WARNING]
> Jangan panggil endpoint yang membutuhkan `Api-Key` langsung di sini, karena itu akan membocorkan API key ke publik. Untuk endpoint terproteksi, gunakan Proxy API (memanggil CryptoSharia API melalui server-side).

Gunakan client-side request hanya untuk endpoint publik, seperti mengambil spesifikasi OpenAPI:

```svelte
<script lang="ts">
	import { createApiClient } from '$lib/api';

	async function fetchSpec() {
		// Menggunakan native fetch
		const client = createApiClient();
		const { data } = await client.GET('/openapi.json', {});

		if (data) console.log('Spec loaded:', data.info.title);
	}
</script>
```

### 5.4 Contoh di Form Actions (`+page.server.ts`)

Fungsi `actions` ini hanya berjalan di **server-side** ketika menerima data melalui request **POST** (biasanya melalui _HTML form_).

```typescript
// src/routes/contact/+page.server.ts
import { createApiClient } from '$lib/api';
import { CS_API_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, fetch }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const message = formData.get('message') as string;

		const client = createApiClient({ fetch, apiKey: CS_API_KEY });

		const { error, response } = await client.POST('/messages', {
			body: { name, email, message }
		});

		if (error) return fail(400, { message: 'Gagal mengirim pesan' });

		return { success: true };
	}
};
```

### 5.5 Contoh di Server Endpoints (`+server.ts`)

Fungsi ini (sering dipakai ketika kita ingin membuat **API Route**) hanya berjalan di **server-side**.

```typescript
// src/routes/api/posts/+server.ts
import { createApiClient } from '$lib/api';
import { CS_API_KEY } from '$env/static/private';

export const GET = async ({ fetch }) => {
	const client = createApiClient({ fetch, apiKey: CS_API_KEY });
	const { data, error, response } = await client.GET('/posts');

	if (error) {
		return Response.json(error, { status: response.status });
	}

	return Response.json(data);
};
```

### 5.6 Contoh di Remote Functions (RPC)

SvelteKit (>= 2.27) mendukung **Remote Functions** yang didefinisikan di file `.remote.ts`. Fitur ini memungkinkan kita memanggil functions yang ada di server secara langsung dan _type-safe_ dari komponen.

Di sini, kita menggunakan `getRequestEvent()` untuk mendapatkan `fetch` internal.

> [!NOTE]
> Fitur ini masih eksperimental (atleast saat artikel ini ditulis). kita harus menyalakan `kit.experimental.remoteFunctions: true` di `svelte.config.js`.

```typescript
// src/lib/data.remote.ts
import { getRequestEvent, query } from '$app/server';
import { createApiClient } from '$lib/api';
import { CS_API_KEY } from '$env/static/private';

export const getPosts = query(async () => {
	// Ambil `RequestEvent` dari context remote function
	const { fetch } = getRequestEvent();

	const client = createApiClient({ fetch, apiKey: CS_API_KEY });

	const { data } = await client.GET('/posts');

	return data?.data ?? [];
});
```

---

## 6. Pro-Tips

- **Type Safety**: Jika kita mencoba menggunakan parameter yang tidak ada, atau mengirim angka padahal yang diminta itu string, **TypeScript akan langsung ngamuk sebelum kode dijalankan**.
- **Error Handling**: `openapi-fetch` nge-return `data` dan `error`. Jadi tidak perlu pakai `try/catch` yang ribet hanya untuk sekadar nge-handle error 4xx/5xx.
- **Enums**: Cek tipe data untuk field yang menggunakan Enum. Itu _strictly typed_, jadi tidak boleh ada typo!

Selamat ngoding! 🚀
