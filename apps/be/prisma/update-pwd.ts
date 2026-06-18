import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  await prisma.user.update({
    where: { email: 'staff-001@ticketbox.vn' },
    data: { password: '$2b$10$E/AQNm1R5sATpi.zaF4HROc00Tttx9zJFrf50QG7RgsprdDuq9Ndy' }
  });
  console.log('Password updated');
  await app.close();
}
bootstrap();
