import type { Order } from '../../orders/entities/order.entity';
import {
    OrderChannel,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from '../../orders/enums/order.enum';

/** Cửa hàng ở Nhật — giờ trong email theo giờ Nhật, giống dashboard. */
const TIME_ZONE = 'Asia/Tokyo';

export interface ShopInfo {
    name: string;
    phone: string;
    address: string;
}

export interface MailContent {
    subject: string;
    html: string;
    text: string;
}

/** Trạng thái đáng báo cho khách. `processing` là việc nội bộ, báo thêm chỉ gây ồn. */
export const CUSTOMER_NOTIFIED_STATUSES: readonly OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.SHIPPING,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
];

type StatusCopy = { subject: string; heading: string; body: string };

interface Dictionary {
    dateLocale: string;
    placedSubject: (code: string) => string;
    placedHeading: string;
    placedIntroUnpaid: string;
    placedIntroPaid: string;
    placedIntroInStore: string;
    greeting: (name: string) => string;
    orderCode: string;
    orderDate: string;
    payment: string;
    paid: string;
    items: string;
    quantity: string;
    subtotal: string;
    discount: string;
    shipping: string;
    total: string;
    shipTo: string;
    note: string;
    reason: string;
    refundNotice: string;
    contact: string;
    paymentMethods: Record<PaymentMethod, string>;
    statuses: Partial<Record<OrderStatus, StatusCopy>>;
    statusSubject: (code: string, title: string) => string;
}

const DICTIONARIES: Record<'ja' | 'vi', Dictionary> = {
    ja: {
        dateLocale: 'ja-JP',
        placedSubject: (code) => `ご注文ありがとうございます（注文番号：${code}）`,
        placedHeading: 'ご注文ありがとうございます',
        placedIntroUnpaid:
            'ご注文を受け付けました。内容を確認のうえ、担当者よりあらためてご連絡いたします。',
        placedIntroPaid:
            'お支払いを確認し、ご注文を受け付けました。発送の準備が整い次第ご連絡いたします。',
        placedIntroInStore:
            'ご来店いただき誠にありがとうございました。お支払いを確認いたしましたので、ご購入内容をお送りいたします。',
        greeting: (name) => `${name} 様`,
        orderCode: '注文番号',
        orderDate: '注文日時',
        payment: 'お支払い方法',
        paid: 'お支払い済み',
        items: 'ご注文内容',
        quantity: '数量',
        subtotal: '小計',
        discount: '割引',
        shipping: '送料',
        total: '合計（税込）',
        shipTo: 'お届け先',
        note: '備考',
        reason: '理由',
        refundNotice:
            'お支払い済みの代金は全額返金いたします。カード会社によっては反映まで数日かかる場合がございます。',
        contact:
            'ご不明な点がございましたら、このメールにご返信いただくか、下記までお問い合わせください。',
        paymentMethods: {
            [PaymentMethod.COD]: '代金引換',
            [PaymentMethod.BANK_TRANSFER]: '銀行振込',
            [PaymentMethod.CREDIT_CARD]: 'クレジットカード',
            [PaymentMethod.E_WALLET]: '電子マネー',
            [PaymentMethod.STRIPE]: 'クレジットカード / PayPay',
            [PaymentMethod.STRIPE_TERMINAL]: 'クレジットカード（店頭）',
            [PaymentMethod.CASH]: '現金',
        },
        statuses: {
            [OrderStatus.CONFIRMED]: {
                subject: 'ご注文を確認しました',
                heading: 'ご注文を確認しました',
                body: 'ご注文内容を確認いたしました。発送の準備を進めてまいります。',
            },
            [OrderStatus.SHIPPING]: {
                subject: '商品を発送しました',
                heading: '商品を発送しました',
                body: 'ご注文の商品を発送いたしました。到着まで今しばらくお待ちください。',
            },
            [OrderStatus.COMPLETED]: {
                subject: 'お届けが完了しました',
                heading: 'お届けが完了しました',
                body: 'このたびはご利用いただき誠にありがとうございました。またのご利用をお待ちしております。',
            },
            [OrderStatus.CANCELLED]: {
                subject: 'ご注文をキャンセルしました',
                heading: 'ご注文をキャンセルしました',
                body: '以下のご注文はキャンセルとなりました。',
            },
            [OrderStatus.REFUNDED]: {
                subject: '返金手続きが完了しました',
                heading: '返金手続きが完了しました',
                body: '以下のご注文について返金の手続きが完了しました。カード会社によっては反映まで数日かかる場合がございます。',
            },
        },
        statusSubject: (code, title) => `${title}（注文番号：${code}）`,
    },
    vi: {
        dateLocale: 'vi-VN',
        placedSubject: (code) => `Xác nhận đơn hàng ${code}`,
        placedHeading: 'Cảm ơn bạn đã đặt hàng',
        placedIntroUnpaid:
            'Chúng tôi đã nhận được đơn hàng của bạn. Cửa hàng sẽ liên hệ để xác nhận trong thời gian sớm nhất.',
        placedIntroPaid:
            'Chúng tôi đã nhận được thanh toán và đơn hàng của bạn. Cửa hàng sẽ thông báo khi đơn được gửi đi.',
        placedIntroInStore:
            'Cảm ơn bạn đã mua hàng tại cửa hàng. Đây là thông tin đơn hàng của bạn.',
        greeting: (name) => `Xin chào ${name},`,
        orderCode: 'Mã đơn hàng',
        orderDate: 'Thời gian đặt',
        payment: 'Thanh toán',
        paid: 'Đã thanh toán',
        items: 'Sản phẩm',
        quantity: 'SL',
        subtotal: 'Tạm tính',
        discount: 'Giảm giá',
        shipping: 'Phí vận chuyển',
        total: 'Tổng cộng',
        shipTo: 'Giao đến',
        note: 'Ghi chú',
        reason: 'Lý do',
        refundNotice:
            'Số tiền bạn đã thanh toán sẽ được hoàn lại toàn bộ. Tuỳ ngân hàng, tiền có thể mất vài ngày để về tài khoản.',
        contact:
            'Nếu có thắc mắc, bạn chỉ cần trả lời email này hoặc liên hệ cửa hàng theo thông tin bên dưới.',
        paymentMethods: {
            [PaymentMethod.COD]: 'Thanh toán khi nhận hàng',
            [PaymentMethod.BANK_TRANSFER]: 'Chuyển khoản ngân hàng',
            [PaymentMethod.CREDIT_CARD]: 'Thẻ tín dụng',
            [PaymentMethod.E_WALLET]: 'Ví điện tử',
            [PaymentMethod.STRIPE]: 'Thẻ tín dụng / PayPay',
            [PaymentMethod.STRIPE_TERMINAL]: 'Quẹt thẻ tại quầy',
            [PaymentMethod.CASH]: 'Tiền mặt',
        },
        statuses: {
            [OrderStatus.CONFIRMED]: {
                subject: 'Đơn hàng đã được xác nhận',
                heading: 'Đơn hàng đã được xác nhận',
                body: 'Cửa hàng đã xác nhận đơn hàng của bạn và đang chuẩn bị hàng.',
            },
            [OrderStatus.SHIPPING]: {
                subject: 'Đơn hàng đang được giao',
                heading: 'Đơn hàng đang được giao',
                body: 'Đơn hàng của bạn đã được gửi đi. Vui lòng chú ý điện thoại để nhận hàng.',
            },
            [OrderStatus.COMPLETED]: {
                subject: 'Đơn hàng đã hoàn tất',
                heading: 'Đơn hàng đã hoàn tất',
                body: 'Cảm ơn bạn đã mua sắm tại cửa hàng. Hẹn gặp lại bạn lần sau!',
            },
            [OrderStatus.CANCELLED]: {
                subject: 'Đơn hàng đã bị huỷ',
                heading: 'Đơn hàng đã bị huỷ',
                body: 'Đơn hàng dưới đây đã bị huỷ.',
            },
            [OrderStatus.REFUNDED]: {
                subject: 'Đơn hàng đã được hoàn tiền',
                heading: 'Đơn hàng đã được hoàn tiền',
                body: 'Đơn hàng dưới đây đã được hoàn tiền. Tuỳ ngân hàng, tiền có thể mất vài ngày để về tài khoản.',
            },
        },
        statusSubject: (code, title) => `${title} — ${code}`,
    },
};

/** Mail gửi khách luôn bằng tiếng Nhật, bất kể `order.locale`; từ điển `vi` chỉ dùng cho mail nội bộ. */
/** Email xác nhận gửi khách khi đơn được nhận (COD vừa đặt / online vừa trả tiền xong). */
export function buildOrderPlacedMail(order: Order, shop: ShopInfo): MailContent {
    const t = DICTIONARIES.ja;
    const paid = order.paymentStatus === PaymentStatus.PAID;
    const intro =
        order.channel === OrderChannel.IN_STORE
            ? t.placedIntroInStore
            : paid
              ? t.placedIntroPaid
              : t.placedIntroUnpaid;

    return {
        subject: withShop(t.placedSubject(order.code), shop),
        html: layout(shop, t.placedHeading, [
            paragraph(t.greeting(order.shippingAddress.fullName)),
            paragraph(intro),
            orderDetailsHtml(order, t),
            paragraph(t.contact, true),
        ]),
        text: [
            t.greeting(order.shippingAddress.fullName),
            '',
            intro,
            '',
            orderDetailsText(order, t),
            '',
            t.contact,
            shopFooterText(shop),
        ].join('\n'),
    };
}

/** `null` khi trạng thái này không cần báo khách. */
export function buildOrderStatusMail(
    order: Order,
    status: OrderStatus,
    shop: ShopInfo,
): MailContent | null {
    const t = DICTIONARIES.ja;
    const copy = t.statuses[status];
    if (!copy) return null;

    const cancelledAfterPaying =
        status === OrderStatus.CANCELLED &&
        (order.paymentStatus === PaymentStatus.PAID ||
            order.paymentStatus === PaymentStatus.REFUNDED);
    const extra: string[] = [];
    if (status === OrderStatus.CANCELLED && order.cancelReason) {
        extra.push(`${t.reason}: ${order.cancelReason}`);
    }
    if (cancelledAfterPaying) extra.push(t.refundNotice);

    return {
        subject: withShop(t.statusSubject(order.code, copy.subject), shop),
        html: layout(shop, copy.heading, [
            paragraph(t.greeting(order.shippingAddress.fullName)),
            paragraph(copy.body),
            ...extra.map((line) => paragraph(line)),
            orderDetailsHtml(order, t),
            paragraph(t.contact, true),
        ]),
        text: [
            t.greeting(order.shippingAddress.fullName),
            '',
            copy.body,
            ...extra,
            '',
            orderDetailsText(order, t),
            '',
            t.contact,
            shopFooterText(shop),
        ].join('\n'),
    };
}

/** Báo nhân viên có đơn mới — luôn bằng tiếng Việt, kèm link mở đơn trong admin. */
export function buildShopNewOrderMail(
    order: Order,
    shop: ShopInfo,
    adminOrderUrl: string | null,
): MailContent {
    const t = DICTIONARIES.vi;
    const method = t.paymentMethods[order.paymentMethod];
    const paidLabel = order.paymentStatus === PaymentStatus.PAID ? ' (đã thanh toán)' : '';
    const address = order.shippingAddress;
    const customerRows: Array<[string, string]> = [
        ['Khách hàng', address.fullName],
        ['Điện thoại', address.phone],
        ['Email', order.customerEmail ?? '—'],
        ['Thanh toán', `${method}${paidLabel}`],
    ];

    return {
        subject: `[Đơn mới] ${order.code} — ${formatYen(order.total)} — ${method}${paidLabel}`,
        html: layout(shop, `Đơn hàng mới ${escapeHtml(order.code)}`, [
            keyValueTable(customerRows),
            orderDetailsHtml(order, t),
            adminOrderUrl ? button('Mở đơn trong trang quản trị', adminOrderUrl) : '',
        ]),
        text: [
            `Đơn hàng mới ${order.code}`,
            ...customerRows.map(([key, value]) => `${key}: ${value}`),
            '',
            orderDetailsText(order, t),
            adminOrderUrl ? `\nMở đơn: ${adminOrderUrl}` : '',
        ].join('\n'),
    };
}

// ---------------------------------------------------------------------------
// Khối nội dung dùng chung
// ---------------------------------------------------------------------------

function orderDetailsHtml(order: Order, t: Dictionary): string {
    const summaryRows: Array<[string, string]> = [
        [t.orderCode, order.code],
        [t.orderDate, formatDate(order.createdAt, t)],
        [
            t.payment,
            `${t.paymentMethods[order.paymentMethod]}${
                order.paymentStatus === PaymentStatus.PAID ? `（${t.paid}）` : ''
            }`,
        ],
    ];

    const itemRows = topLevelItems(order)
        .map(
            ({ item, components }) => `
            <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eceef2;vertical-align:top">
                    <div style="font-weight:600;color:#1f2430">${escapeHtml(itemName(item))}</div>
                    ${components
                        .map(
                            (component) =>
                                `<div style="font-size:12px;color:#7a8190;margin-top:2px">・${escapeHtml(
                                    itemName(component),
                                )} × ${component.quantity}</div>`,
                        )
                        .join('')}
                    <div style="font-size:12px;color:#7a8190;margin-top:2px">${t.quantity}: ${
                        item.quantity
                    }</div>
                </td>
                <td style="padding:10px 0;border-bottom:1px solid #eceef2;text-align:right;vertical-align:top;white-space:nowrap;font-weight:600;color:#1f2430">${formatYen(
                    item.total,
                )}</td>
            </tr>`,
        )
        .join('');

    const totals: Array<[string, string, boolean]> = [
        [t.subtotal, formatYen(order.subtotal), false],
    ];
    if (order.discount > 0) totals.push([t.discount, `-${formatYen(order.discount)}`, false]);
    totals.push([t.shipping, formatYen(order.shippingFee), false]);
    totals.push([t.total, formatYen(order.total), true]);

    const address = order.shippingAddress;

    return `
        ${keyValueTable(summaryRows)}
        <h3 style="font-size:14px;margin:24px 0 4px;color:#1f2430">${t.items}</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">${itemRows}</table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin-top:8px">
            ${totals
                .map(
                    ([label, value, strong]) => `
                <tr>
                    <td style="padding:4px 0;color:${strong ? '#1f2430' : '#7a8190'};${
                        strong ? 'font-weight:700;font-size:16px;padding-top:10px' : ''
                    }">${label}</td>
                    <td style="padding:4px 0;text-align:right;white-space:nowrap;color:#1f2430;${
                        strong ? 'font-weight:700;font-size:16px;padding-top:10px' : ''
                    }">${value}</td>
                </tr>`,
                )
                .join('')}
        </table>
        ${
            // Đơn tại quầy: khách nhận hàng ngay, không có địa chỉ giao
            order.channel === OrderChannel.IN_STORE
                ? ''
                : `<h3 style="font-size:14px;margin:24px 0 4px;color:#1f2430">${t.shipTo}</h3>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#3a4150">
            ${escapeHtml(address.fullName)}<br>
            ${escapeHtml(address.phone)}<br>
            ${escapeHtml(formatAddress(order))}
        </p>`
        }
        ${
            order.note
                ? `<h3 style="font-size:14px;margin:24px 0 4px;color:#1f2430">${t.note}</h3>
                   <p style="margin:0;font-size:14px;line-height:1.6;color:#3a4150">${escapeHtml(order.note)}</p>`
                : ''
        }`;
}

function orderDetailsText(order: Order, t: Dictionary): string {
    const lines = [
        `${t.orderCode}: ${order.code}`,
        `${t.orderDate}: ${formatDate(order.createdAt, t)}`,
        `${t.payment}: ${t.paymentMethods[order.paymentMethod]}${
            order.paymentStatus === PaymentStatus.PAID ? ` (${t.paid})` : ''
        }`,
        '',
        `[${t.items}]`,
    ];
    for (const { item, components } of topLevelItems(order)) {
        lines.push(`- ${itemName(item)} × ${item.quantity}  ${formatYen(item.total)}`);
        for (const component of components) {
            lines.push(`    ・${itemName(component)} × ${component.quantity}`);
        }
    }
    lines.push('', `${t.subtotal}: ${formatYen(order.subtotal)}`);
    if (order.discount > 0) lines.push(`${t.discount}: -${formatYen(order.discount)}`);
    lines.push(
        `${t.shipping}: ${formatYen(order.shippingFee)}`,
        `${t.total}: ${formatYen(order.total)}`,
    );
    if (order.channel !== OrderChannel.IN_STORE) {
        lines.push(
            '',
            `[${t.shipTo}]`,
            order.shippingAddress.fullName,
            order.shippingAddress.phone,
            formatAddress(order),
        );
    }
    if (order.note) lines.push('', `[${t.note}]`, order.note);
    return lines.join('\n');
}

/** Dòng cha + các dòng thành phần combo của nó (thành phần giá 0, chỉ để liệt kê). */
function topLevelItems(order: Order) {
    const items = order.items ?? [];
    return items
        .filter((item) => item.parentItemId === null)
        .map((item) => ({
            item,
            components: items.filter((child) => child.parentItemId === item.id),
        }));
}

function itemName(item: { productName: string; variantName: string | null }): string {
    return item.variantName && item.variantName !== item.productName
        ? `${item.productName} (${item.variantName})`
        : item.productName;
}

function formatAddress(order: Order): string {
    const address = order.shippingAddress;
    return [address.street, address.ward, address.district, address.province]
        .filter(Boolean)
        .join(', ');
}

// ---------------------------------------------------------------------------
// Khung HTML — inline style vì nhiều trình đọc mail bỏ thẻ <style>
// ---------------------------------------------------------------------------

function layout(shop: ShopInfo, heading: string, blocks: string[]): string {
    return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Hiragino Kaku Gothic ProN','Segoe UI',Meiryo,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px">
        <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden">
                <tr><td style="background:#397dbb;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:700">${escapeHtml(
                    shop.name,
                )}</td></tr>
                <tr><td style="padding:24px">
                    <h1 style="font-size:20px;margin:0 0 16px;color:#1f2430">${heading}</h1>
                    ${blocks.join('\n')}
                </td></tr>
                <tr><td style="padding:16px 24px;background:#fafbfc;border-top:1px solid #eceef2;font-size:12px;line-height:1.6;color:#7a8190">
                    ${shopFooterHtml(shop)}
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}

function paragraph(text: string, muted = false): string {
    return `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${
        muted ? '#7a8190' : '#3a4150'
    }">${escapeHtml(text)}</p>`;
}

function keyValueTable(rows: Array<[string, string]>): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;background:#f7f9fc;border-radius:6px;margin:8px 0">
        ${rows
            .map(
                ([key, value]) => `<tr>
            <td style="padding:8px 12px;color:#7a8190;white-space:nowrap;width:1%">${escapeHtml(key)}</td>
            <td style="padding:8px 12px;color:#1f2430;font-weight:600">${escapeHtml(value)}</td>
        </tr>`,
            )
            .join('')}
    </table>`;
}

function button(label: string, url: string): string {
    return `<p style="margin:24px 0 0"><a href="${escapeHtml(
        url,
    )}" style="display:inline-block;background:#397dbb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:600">${escapeHtml(
        label,
    )}</a></p>`;
}

function shopFooterHtml(shop: ShopInfo): string {
    return [shop.name, shop.phone, shop.address]
        .filter(Boolean)
        .map((line) => escapeHtml(line))
        .join('<br>');
}

function shopFooterText(shop: ShopInfo): string {
    const lines = [shop.name, shop.phone, shop.address].filter(Boolean);
    return lines.length > 0 ? ['', '--', ...lines].join('\n') : '';
}

function withShop(subject: string, shop: ShopInfo): string {
    return shop.name ? `【${shop.name}】${subject}` : subject;
}

function formatYen(amount: number): string {
    return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
}

function formatDate(value: Date | string, t: Dictionary): string {
    return new Intl.DateTimeFormat(t.dateLocale, {
        timeZone: TIME_ZONE,
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

/** Mọi dữ liệu khách nhập (tên, địa chỉ, ghi chú) đều qua đây trước khi vào HTML. */
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
