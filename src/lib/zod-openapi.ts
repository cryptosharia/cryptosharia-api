import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import z from 'zod';

// Extend Zod with OpenAPI methods once
extendZodWithOpenApi(z);

// Export the extended Zod instance
export default z;
