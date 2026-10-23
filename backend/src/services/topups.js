import { prisma } from '../db.js';

// Idempotent settlement: a paid order credits its user exactly once, whether the
// confirmation arrives via the checkout callback, a webhook, or both/repeatedly.
export async function settleOrderPaid({ orderId, paymentId }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({ where: { orderId } });
    if (!order) {
      const err = new Error('Unknown payment order');
      err.status = 404;
      throw err;
    }
    if (order.status === 'PAID') return { credited: false, already: true, order };
    const claimed = await tx.paymentOrder.updateMany({
      where: { orderId, status: 'CREATED' },
      data: { status: 'PAID', paymentId: paymentId || null },
    });
    if (claimed.count === 0) return { credited: false, already: true, order };
    await tx.user.update({ where: { id: order.userId }, data: { credits: { increment: order.credits } } });
    await tx.creditTransaction.create({
      data: { userId: order.userId, delta: order.credits, reason: 'TOPUP_PURCHASE' },
    });
    return { credited: true, order };
  });
}
