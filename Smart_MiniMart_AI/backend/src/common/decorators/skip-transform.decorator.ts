import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Đánh dấu route trả về body THÔ (không bọc { success, data, timestamp }).
 * Dùng cho các callback bên thứ ba yêu cầu format cố định, ví dụ VNPay IPN { RspCode, Message }.
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
