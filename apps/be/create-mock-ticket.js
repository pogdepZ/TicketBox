const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const concert = await prisma.concert.findFirst();
  if (!concert) throw new Error("No concert found!");

  const ticketType = await prisma.ticketType.findFirst();
  const user = await prisma.user.findFirst();

  // Create an Order first (required for Ticket)
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      reservationId: '00000000-0000-0000-0000-000000000000', // Mock
      idempotencyKey: 'mock-' + Date.now(),
      status: 'PAID',
      totalAmount: 1000000,
      expiresAt: new Date(),
    }
  });

  const ticket = await prisma.ticket.create({
    data: {
      orderId: order.id,
      ticketTypeId: ticketType.id,
      ownerUserId: user.id,
      concertId: concert.id,
      ticketCode: 'TEST-12345',
      qrPayload: 'mock-qr-payload',
      status: 'ACTIVE'
    }
  });

  console.log('✅ Created Mock Ticket successfully: TEST-12345');
}

main().catch(console.error).finally(() => prisma.$disconnect());
