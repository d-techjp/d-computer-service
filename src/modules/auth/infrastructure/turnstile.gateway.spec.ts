import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { TurnstileGateway } from './turnstile.gateway';

const gatewayWith = (secret: string) =>
    new TurnstileGateway({ get: () => secret } as unknown as ConfigService);

describe('TurnstileGateway', () => {
    const fetchMock = jest.fn<Promise<unknown>, [string, RequestInit]>();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    it('fail-closed khi thiếu secret', async () => {
        await expect(gatewayWith('').verify('token')).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('từ chối khi không gửi token', async () => {
        await expect(gatewayWith('secret').verify(undefined)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('cho qua khi Cloudflare xác nhận', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({ success: true }) });

        await expect(gatewayWith('secret').verify('token', '1.2.3.4')).resolves.toBeUndefined();
        const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
        expect(body.get('response')).toBe('token');
        expect(body.get('remoteip')).toBe('1.2.3.4');
    });

    it('từ chối khi Cloudflare báo token sai hoặc đã dùng', async () => {
        fetchMock.mockResolvedValue({
            json: () =>
                Promise.resolve({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
        });

        await expect(gatewayWith('secret').verify('token')).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('fail-closed khi không gọi được Cloudflare', async () => {
        fetchMock.mockRejectedValue(new Error('network down'));

        await expect(gatewayWith('secret').verify('token')).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });
});
