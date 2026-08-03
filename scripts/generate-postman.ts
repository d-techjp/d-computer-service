import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { convert, type CollectionResult } from 'openapi-to-postmanv2';

interface PostmanUrl {
    path?: string[];
    host?: string[];
}

interface PostmanEvent {
    listen: 'test' | 'prerequest';
    script: { type: 'text/javascript'; exec: string[] };
}

interface PostmanRequestItem {
    name: string;
    request?: { method?: string; url?: PostmanUrl };
    event?: PostmanEvent[];
    item?: PostmanRequestItem[];
}

interface PostmanCollection {
    info: { name?: string; [key: string]: unknown };
    item: PostmanRequestItem[];
    [key: string]: unknown;
}

/** Test script Postman: đọc field trong `data` của response envelope rồi lưu vào environment. */
const captureScript = (envVar: string, field: string): PostmanEvent => ({
    listen: 'test',
    script: {
        type: 'text/javascript',
        exec: [
            `// Tự động lưu ${field} vào biến environment "${envVar}" sau khi gọi thành công`,
            'if (pm.response.code >= 200 && pm.response.code < 300) {',
            '    const body = pm.response.json();',
            `    const value = body?.data?.${field};`,
            '    if (value) {',
            `        pm.environment.set('${envVar}', value);`,
            `        console.log('Đã lưu ${envVar} vào environment');`,
            '    }',
            '}',
        ],
    },
});

const clearTokenScript: PostmanEvent = {
    listen: 'test',
    script: {
        type: 'text/javascript',
        exec: [
            '// Logout thành công -> token cũ không còn dùng được nữa, xoá khỏi environment',
            'if (pm.response.code >= 200 && pm.response.code < 300) {',
            "    pm.environment.unset('accessToken');",
            "    console.log('Đã xoá accessToken khỏi environment');",
            '}',
        ],
    },
};

/** So khớp path cuối cùng của request (bỏ qua {{baseUrl}} và version) với danh sách segment. */
const matchesPath = (url: PostmanUrl | undefined, ...segments: string[]): boolean => {
    const path = url?.path ?? [];
    if (path.length < segments.length) return false;
    return segments.every((segment, i) => path[path.length - segments.length + i] === segment);
};

/** Duyệt đệ quy cây item (folder lồng folder) để gắn test-script vào đúng request auth. */
const attachAuthScripts = (items: PostmanRequestItem[]): void => {
    for (const entry of items) {
        if (entry.item) {
            attachAuthScripts(entry.item);
            continue;
        }
        const url = entry.request?.url;
        const method = entry.request?.method;

        if (method === 'POST' && matchesPath(url, 'auth', 'login')) {
            entry.event = [captureScript('accessToken', 'accessToken')];
        } else if (method === 'POST' && matchesPath(url, 'auth', 'register')) {
            entry.event = [captureScript('accessToken', 'accessToken')];
        } else if (method === 'POST' && matchesPath(url, 'auth', 'change-password')) {
            entry.event = [captureScript('accessToken', 'accessToken')];
        } else if (method === 'POST' && matchesPath(url, 'auth', 'logout')) {
            entry.event = [clearTokenScript];
        }
    }
};

/**
 * Đọc openapi/openapi.json (sinh bởi `npm run docs:openapi`) và convert sang Postman
 * Collection v2.1. `{{baseUrl}}` để đổi domain theo environment, `{{accessToken}}` được
 * request login/register/change-password tự lưu qua test script — không cần copy tay.
 */
async function main(): Promise<void> {
    const openApiPath = join(__dirname, '..', 'openapi', 'openapi.json');
    if (!existsSync(openApiPath)) {
        throw new Error('Không tìm thấy openapi/openapi.json — chạy "npm run docs:openapi" trước');
    }

    const spec = JSON.parse(readFileSync(openApiPath, 'utf-8')) as object;

    const collection = await new Promise<PostmanCollection>((resolve, reject) => {
        convert(
            { type: 'json', data: spec },
            {
                folderStrategy: 'Tags',
                requestParametersResolution: 'Example',
                exampleParametersResolution: 'Example',
                collapseFolders: true,
                requestNameSource: 'Fallback',
            },
            (err, result: CollectionResult | undefined) => {
                if (err) return reject(new Error(err.message));
                if (!result?.result || !result.output?.[0]) {
                    return reject(new Error(result?.reason ?? 'Convert thất bại không rõ lý do'));
                }
                resolve(result.output[0].data as PostmanCollection);
            },
        );
    });

    // openapi-to-postmanv2 tự tạo biến collection `baseUrl` từ servers[0].url (domain gốc,
    // KHÔNG gồm /api/v1 vì prefix đã nằm sẵn trong path của từng request) và dùng {{bearerToken}}
    // cho scheme bearer — đổi thành {{accessToken}} để khớp tên field trong AuthResponseDto.
    const raw = JSON.stringify(collection).replace(/\{\{bearerToken\}\}/g, '{{accessToken}}');

    const result = JSON.parse(raw) as PostmanCollection;
    attachAuthScripts(result.item);

    const outDir = join(__dirname, '..', 'postman');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
        join(outDir, 'D-Computer-Service.postman_collection.json'),
        `${JSON.stringify(result, null, 2)}\n`,
    );

    process.stdout.write('Đã ghi postman/D-Computer-Service.postman_collection.json\n');
}

main().catch((error: unknown) => {
    process.stderr.write(`Sinh Postman collection thất bại: ${String(error)}\n`);
    process.exit(1);
});
