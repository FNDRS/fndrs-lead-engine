import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LeadDiscoveryService } from './lead-discovery.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, LeadDiscoveryService],
})
export class AppModule {}
