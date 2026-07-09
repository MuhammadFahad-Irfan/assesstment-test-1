import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { BudgetItemsModule } from './budget-items/budget-items.module';
import { AiModule } from './ai/ai.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EventsModule,
    BudgetItemsModule,
    AiModule,
    RealtimeModule,
  ],
})
export class AppModule {}
