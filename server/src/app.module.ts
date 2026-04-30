import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LeadAnalysisService } from './lead-analysis.service';
import { LeadDiscoveryService } from './lead-discovery.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, LeadDiscoveryService, LeadAnalysisService],
})
export class AppModule {}
